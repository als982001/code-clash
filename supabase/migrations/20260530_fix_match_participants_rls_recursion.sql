-- 42P17 infinite recursion fix:
-- 20260510_tighten_rls_for_invite_security.sql 에서 도입된
-- match_participants SELECT 정책(match_participants_co_participant_read)이
-- USING 절에서 match_participants 자기 자신을 EXISTS 서브쿼리로 조회 → RLS 무한 재귀.
--
-- matches.matches_self_or_participant_read 도 match_participants 를 EXISTS 로 조회하는데,
-- 그 평가가 위 재귀 정책을 건드려 matches insert(.select()) 단계에서 42P17 로 터진다.
--
-- 해결: "이 유저가 해당 match 의 참가자인가" 판정을 SECURITY DEFINER 함수로 분리한다.
-- 함수는 소유자 권한으로 실행돼 안쪽 조회에 RLS 가 적용되지 않으므로 자기참조 재귀가 끊긴다.

-- ── 참가자 여부 판정 헬퍼 (RLS 우회) ─────────────────────
-- @param p_match_id 검사 대상 match id
-- @return 현재 auth.uid() 가 해당 match 의 참가자면 true
CREATE OR REPLACE FUNCTION public.is_match_participant(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER   -- 함수 소유자 권한 → 안쪽 SELECT 에 RLS 미적용 → 정책 재귀 차단
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.match_participants
    WHERE match_id = p_match_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_match_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_match_participant(uuid) TO authenticated;

-- ── match_participants SELECT 정책 교체 (자기참조 제거) ───
DROP POLICY IF EXISTS "match_participants_co_participant_read" ON public.match_participants;

CREATE POLICY "match_participants_co_participant_read"
  ON public.match_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_match_participant(match_id)
  );

-- ── matches SELECT 정책도 동일 함수로 통일 (일관성/성능) ──
-- 자기참조는 아니었지만 같은 EXISTS 서브쿼리를 함수로 묶어 의도를 명확히 한다.
DROP POLICY IF EXISTS "matches_self_or_participant_read" ON public.matches;

CREATE POLICY "matches_self_or_participant_read"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR public.is_match_participant(id)
  );
