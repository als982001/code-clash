-- Post-MVP A-1 후속: 리더보드 전적 표시.
-- get_profile_stats(단일 유저 전적)의 "전체 유저 확장판" RPC.
-- matches/match_participants RLS가 본인 외 데이터 SELECT를 차단하므로(타인 전적이 0/0/0으로
-- 잘못 보이는 회귀 방지) SECURITY DEFINER STABLE로 안전 우회한다.
--
-- 0전 유저도 리더보드에 표시해야 하므로 LEFT JOIN 사용(get_profile_stats는 INNER JOIN).
-- LEFT JOIN에서 매치가 없는 유저는 m.* 가 전부 NULL인 1 row가 생기는데, 이 NULL row가
-- draws(winner_id IS NULL)로 오집계되지 않도록 draws 필터에 `m.status = 'finished'` 조건을 함께 둔다
-- (매치 없는 유저는 m.status가 NULL이라 false → draw 미집계).
--
-- profiles 에 wins/losses/streak 컬럼이 물리적으로 존재하지만 동기화가 보장되지 않으므로(tier 와 동일하게
-- 미신뢰 컬럼) 사용하지 않고 matches/match_participants 에서 매번 재집계한다 — get_profile_stats 와 동일 정책.
-- 정렬/필터는 기존 getLeaderboard 직접 select와 동일: 익명(Anon_) 제외, mmr DESC NULLS LAST → created_at ASC.
-- 반환은 공개 프로필 정보 + 집계 카운트만 (개별 match row/상대/PII 누출 없음).
-- 권한: 리더보드는 로그인(authenticated) 전용이므로 authenticated만 EXECUTE, anon은 명시 REVOKE.
-- 멱등 작성: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  nickname text,
  avatar_url text,
  mmr integer,
  created_at timestamptz,
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
    p.id,
    p.nickname,
    p.avatar_url,
    p.mmr,
    p.created_at,
    COUNT(*) FILTER (WHERE m.winner_id = p.id)::int                                AS wins,
    COUNT(*) FILTER (WHERE m.winner_id IS NOT NULL AND m.winner_id <> p.id)::int   AS losses,
    COUNT(*) FILTER (WHERE m.winner_id IS NULL AND m.status = 'finished')::int     AS draws,
    COUNT(*) FILTER (WHERE m.status = 'finished')::int                             AS total_finished
  FROM profiles p
  LEFT JOIN match_participants mp ON mp.user_id = p.id
  LEFT JOIN matches m ON m.id = mp.match_id AND m.status = 'finished'
  WHERE p.nickname NOT LIKE 'Anon\_%'
  GROUP BY p.id, p.nickname, p.avatar_url, p.mmr, p.created_at
  ORDER BY p.mmr DESC NULLS LAST, p.created_at ASC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM public;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

COMMENT ON FUNCTION public.get_leaderboard(integer) IS
  'Post-MVP A-1 후속: 전체 유저 mmr + finished 매치 누적 전적 (RLS 우회, authenticated 전용).';
