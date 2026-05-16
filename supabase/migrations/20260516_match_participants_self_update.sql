-- §D-2-d — match_participants.self_update 정책 신설 + 보호 컬럼 트리거
--
-- 문제: match_participants에 UPDATE 정책이 부재하여 RLS deny.
-- submit/route.ts의 score 갱신이 silent fail(0 rows affected) 중이었음.
-- 결과: match_participants.score 26건 전부 NULL, 매치 winner 판정이 score 비교 없이
-- 동점 분기(submitted_at)로만 결정되는 회귀 발생.
--
-- 해결: 자기 row만 UPDATE 가능한 self_update 정책 + score 외 모든 컬럼을
-- OLD 값에 고정하는 BEFORE UPDATE 트리거.
-- 실제 컬럼: id, match_id, user_id, score, mmr_change, is_disconnected, created_at
-- 인가 사용자가 갱신 가능한 컬럼은 score 한 곳만. 나머지 6개 컬럼은 보호.
-- service_role은 트리거 우회 분기.

-- 1) self_update 정책 — 본인 row만 UPDATE
CREATE POLICY "self_update"
  ON public.match_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 2) 보호 컬럼 트리거 — id / match_id / user_id / created_at / mmr_change / is_disconnected 잠금
--    (score만 인가 사용자 갱신 허용. mmr_change·is_disconnected는 service-role 경로 전용)
CREATE OR REPLACE FUNCTION public.prevent_protected_match_participants_update()
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
     OR NEW.match_id IS DISTINCT FROM OLD.match_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.mmr_change IS DISTINCT FROM OLD.mmr_change
     OR NEW.is_disconnected IS DISTINCT FROM OLD.is_disconnected
  THEN
    RAISE EXCEPTION 'match_participants: protected column may not be modified by authenticated user';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_protected_match_participants_update ON public.match_participants;
CREATE TRIGGER prevent_protected_match_participants_update
  BEFORE UPDATE ON public.match_participants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_match_participants_update();
