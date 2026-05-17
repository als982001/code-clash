-- Step 3 프로필 PR (#18): 누적 전적 집계 RPC.
-- matches/match_participants RLS는 본인 참가/호스트 매치만 SELECT 허용 → 타인 프로필 진입 시 전적이 0/0/0로 보이는 회귀를 막기 위해
-- SECURITY DEFINER STABLE RPC로 안전 우회한다. winner_id가 NULL이면서 status='finished'인 경우만 draw로 카운트.
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
    COUNT(*) FILTER (WHERE m.winner_id IS NULL  AND m.status = 'finished')::int         AS draws,
    COUNT(*)::int                                                                       AS total_finished
  FROM match_participants mp
  JOIN matches m ON m.id = mp.match_id AND m.status = 'finished'
  WHERE mp.user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_profile_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_profile_stats(uuid) IS
  'Step 3 PR #18: 특정 유저의 finished 매치 기준 누적 전적 (RLS 우회).';
