-- §D-2-b — matches.participant_update 정책에 WITH CHECK + BEFORE UPDATE 트리거 추가
--
-- 문제: 기존 participant_update 정책은 USING만 존재하여 같은 매치 참가자가
-- winner_id, host_id, invite_token, problem_id, start_time 등 임의 컬럼을 UPDATE 가능.
-- 해결: USING은 동일 유지하고, WITH CHECK로 status·winner_id를 잠그고,
-- BEFORE UPDATE 트리거로 host_id / invite_token / invite_expires_at / problem_id /
-- start_time / created_at / id 컬럼을 OLD 값에 고정한다.
-- service_role(API 라우트의 admin/service 클라이언트)은 트리거 우회 분기로 통과.

-- 1) 기존 USING-only 정책 제거 및 WITH CHECK 동반 정책으로 교체
DROP POLICY IF EXISTS "participant_update" ON public.matches;

CREATE POLICY "participant_update"
  ON public.matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = matches.id AND mp.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = matches.id AND mp.user_id = (SELECT auth.uid())
    )
    -- status는 ongoing 또는 finished만 허용 (waiting -> ongoing 전환은 service-role 경로)
    AND status IN ('ongoing', 'finished')
    -- winner_id는 NULL 또는 같은 매치 참가자만 허용
    AND (
      winner_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.match_participants mp
        WHERE mp.match_id = matches.id AND mp.user_id = winner_id
      )
    )
  );

-- 2) 보호 컬럼 트리거 — OLD vs NEW 비교로 변경 차단
CREATE OR REPLACE FUNCTION public.prevent_protected_matches_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- service_role은 검사 패스 (API 라우트의 service 클라이언트 우회용).
  -- auth.role()은 Supabase 공식 JWT 클레임 헬퍼 — service_role 키로 호출 시 'service_role' 반환.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.host_id IS DISTINCT FROM OLD.host_id
     OR NEW.invite_token IS DISTINCT FROM OLD.invite_token
     OR NEW.invite_expires_at IS DISTINCT FROM OLD.invite_expires_at
     OR NEW.problem_id IS DISTINCT FROM OLD.problem_id
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'matches: protected column may not be modified by authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_protected_matches_update ON public.matches;
CREATE TRIGGER prevent_protected_matches_update
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_matches_update();
