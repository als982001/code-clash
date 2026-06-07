-- Step 3 프로필 PR (#18): 누적 전적 집계 RPC.
-- matches/match_participants RLS는 본인 참가/호스트 매치만 SELECT 허용 → 타인 프로필 진입 시 전적이 0/0/0로 보이는 회귀를 막기 위해
-- SECURITY DEFINER STABLE RPC로 안전 우회한다. JOIN ON에서 status='finished' 매치만 통과시키고,
-- 그중 winner_id가 NULL이면 draw로 카운트 (PR #18 후속 P3-1 fix: FILTER 내부의 중복 status 조건 제거).
-- 멱등 작성: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id uuid)
RETURNS TABLE (
  wins integer,
  losses integer,
  draws integer,
  total_finished integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE m.winner_id = p_user_id)::int                                AS wins,
    COUNT(*) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id <> p_user_id)::int   AS losses,
    COUNT(*) FILTER (WHERE m.winner_id IS NULL)::int                                    AS draws,
    COUNT(*)::int                                                                       AS total_finished
  FROM match_participants mp
  JOIN matches m ON m.id = mp.match_id AND m.status = 'finished'
  WHERE mp.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_profile_stats(uuid) IS
  'Step 3 PR #18: 특정 유저의 finished 매치 기준 누적 전적 (RLS 우회).';
