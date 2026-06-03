-- MVP A-2 자동 매칭 큐
-- 전용 큐 테이블 + RLS(본인 row만) + realtime publication + 원자 매칭 RPC.
-- UPDATE 정책 부재(default deny) → match_id/status 갱신은 service-role RPC 단독
-- (기존 score/winner write primitive 방지 패턴과 동일).

BEGIN;

-- ── 큐 테이블 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  mmr         integer NOT NULL,
  status      text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  match_id    uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- ── RLS: 본인 row만 read/delete. INSERT/UPDATE 정책 없음(default deny) ──
-- INSERT/UPDATE 모두 default deny → 큐 row의 status/match_id 는 service-role RPC 단독으로만
-- 쓰여진다(write primitive 방지). 클라이언트는 폴링(SELECT)·취소(DELETE)만 직접 수행하고,
-- 큐 등록은 service-role 의 find_or_enqueue_match RPC 가 RLS 를 bypass 해 INSERT 한다.
-- self_insert 정책을 두면 인가 사용자가 PostgREST 로 {status:'matched', match_id:<임의>} 를
-- 직접 INSERT 위조할 수 있으므로(score/winner write primitive 와 동형) 의도적으로 두지 않는다.
DROP POLICY IF EXISTS "matchmaking_queue_self_read" ON public.matchmaking_queue;
CREATE POLICY "matchmaking_queue_self_read"
  ON public.matchmaking_queue
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- self_insert 정책은 의도적으로 생성하지 않는다(위 주석 참고). 과거 적용분이 있으면 제거.
DROP POLICY IF EXISTS "matchmaking_queue_self_insert" ON public.matchmaking_queue;

DROP POLICY IF EXISTS "matchmaking_queue_self_delete" ON public.matchmaking_queue;
CREATE POLICY "matchmaking_queue_self_delete"
  ON public.matchmaking_queue
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── Realtime publication 추가 (대기자가 자기 row UPDATE 감지) ──
-- 이미 추가돼 있으면 에러가 나므로 DO 블록으로 멱등 처리.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'matchmaking_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
  END IF;
END $$;

-- ── 원자 매칭 RPC ────────────────────────────────────────────
-- 매칭 탐색·매치 생성·큐 갱신을 단일 트랜잭션에서 원자적으로 수행.
-- FOR UPDATE SKIP LOCKED 로 두 유저 동시 진입 race 차단.
CREATE OR REPLACE FUNCTION public.find_or_enqueue_match(
  p_user_id uuid,
  p_mmr integer
)
RETURNS TABLE (matched boolean, out_match_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opponent   public.matchmaking_queue%ROWTYPE;
  v_problem_id uuid;
  v_match_id   uuid;
BEGIN
  -- (a) 본인 stale row 정리 (재진입 멱등).
  -- 매칭 성사 시(아래 e~g)에는 본인 row 를 다시 만들지 않으므로 여기서 지우고 시작한다.
  -- 단, 같은 유저가 다른 탭에서 거의 동시에 RPC 를 호출하면 DELETE↔(c) INSERT 사이에
  -- UNIQUE(user_id) 충돌(23505)이 날 수 있으므로, (c) 등록은 ON CONFLICT upsert 로 멱등화한다.
  DELETE FROM public.matchmaking_queue WHERE user_id = p_user_id;

  -- (b) 대기 중인 상대 1명 잠금 탐색
  --     - status='waiting' AND 본인 제외
  --     - 10분 초과 좀비 제외
  --     - MMR 가장 가까운 순 → 동률이면 선착순(created_at ASC)
  --     - FOR UPDATE SKIP LOCKED 로 동시 매칭 충돌 차단
  SELECT * INTO v_opponent
  FROM public.matchmaking_queue
  WHERE status = 'waiting'
    AND user_id <> p_user_id
    AND created_at > now() - interval '10 minutes'
  ORDER BY abs(mmr - p_mmr) ASC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    -- (c) 상대 없음 → 내 큐 row 등록 후 매칭 안 됨 반환.
    -- ON CONFLICT 로 동시 재진입(더블클릭) 시 23505 대신 같은 row 를 waiting 으로 갱신.
    --
    -- ⚠️ 알려진 한계 (동시 진입 데드락 — B-8 후속):
    --   유저 A·B 가 거의 동시에 join 하면, 서로 (b) 탐색 시점에 상대가 아직 INSERT 전이라
    --   둘 다 NOT FOUND → 둘 다 waiting 등록 → 누구도 상대를 못 봐 무한 대기에 빠질 수 있다.
    --   클라 폴링/Realtime 은 match_id 만 감시할 뿐 재매칭을 트리거하지 않으므로, 한쪽이
    --   취소 후 재진입해야 해소된다. 동접 극소 전제(윈도우 수십 ms)라 발생 확률이 낮고
    --   취소→재진입 UX 가 이미 있어 MVP 범위로 보류. 동접이 늘면 (a) 클라 N초 후 join 1회
    --   재시도 또는 (b) RPC 큐 재스캔 도입을 검토한다.
    INSERT INTO public.matchmaking_queue (user_id, mmr, status)
      VALUES (p_user_id, p_mmr, 'waiting')
    ON CONFLICT (user_id) DO UPDATE
      SET mmr = EXCLUDED.mmr,
          status = 'waiting',
          match_id = NULL,
          created_at = now();

    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  -- (d) 랜덤 문제 1건
  SELECT id INTO v_problem_id FROM public.problems ORDER BY random() LIMIT 1;

  -- (e) 매치 생성 (자동 매칭이므로 host_id/invite_token 없음 → NULL)
  INSERT INTO public.matches (status, problem_id, start_time)
    VALUES ('ongoing', v_problem_id, now())
    RETURNING id INTO v_match_id;

  -- (f) 참가자 2명 등록
  INSERT INTO public.match_participants (match_id, user_id)
    VALUES (v_match_id, p_user_id), (v_match_id, v_opponent.user_id);

  -- (g) 상대 큐 row 갱신 (대기자가 Realtime으로 감지). 본인 row는 등록 안 함(이미 매칭).
  UPDATE public.matchmaking_queue
    SET status = 'matched', match_id = v_match_id
    WHERE id = v_opponent.id;

  RETURN QUERY SELECT true, v_match_id;
END;
$$;

-- 클라이언트 직접 호출 차단 — API 라우트의 service-role 클라이언트만 호출.
-- ⚠️ Supabase 는 public 스키마 함수 생성 시 default privileges 로 anon/authenticated 에
-- EXECUTE 를 자동 부여한다. REVOKE FROM PUBLIC 만으로는 이 직접 grant 가 지워지지 않으므로
-- anon/authenticated 를 명시적으로 REVOKE 해야 SECURITY DEFINER RPC(RLS 우회)가 클라이언트에
-- 노출되지 않는다. (미적용 시 인가 사용자가 PostgREST 로 임의 p_user_id/p_mmr 매칭·매치 생성 가능)
REVOKE ALL ON FUNCTION public.find_or_enqueue_match(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_or_enqueue_match(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_or_enqueue_match(uuid, integer) TO service_role;

COMMIT;
