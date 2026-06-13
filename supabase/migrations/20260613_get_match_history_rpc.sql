-- Post-MVP A-5: 대전 히스토리.
-- get_profile_stats/get_leaderboard 와 동형 — matches/match_participants RLS 가 타인 매치를
-- 차단하므로 SECURITY DEFINER STABLE 로 RLS 를 안전 우회한다. 카운트가 아니라 개별 매치 row 를
-- p_user_id 관점으로 반환(상대/문제/결과/MMR변동). 반환 PII 는 공개 프로필 정보(닉네임/아바타)뿐.
-- 1:1 전제(match_participants(match_id,user_id) UNIQUE) — 상대는 다른 참가자 1명, 없으면 NULL.
-- 상대 조인은 LATERAL ... LIMIT 1 로 매치당 정확히 1행 보장(미래 다인 매치 도입 시 matchId 행 중복 방지).
-- 권한: /profile 은 로그인 전용이므로 authenticated 단독 GRANT, anon 명시 REVOKE(PR #24 함정 회피).
-- 멱등: CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION public.get_match_history(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  match_id uuid,
  result text,
  problem_title text,
  opponent_id uuid,
  opponent_nickname text,
  opponent_avatar_url text,
  my_mmr_change integer,
  end_time timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    m.id AS match_id,
    CASE
      WHEN m.winner_id = p_user_id THEN 'win'
      WHEN m.winner_id IS NULL       THEN 'draw'
      ELSE 'loss'
    END AS result,
    pr.title              AS problem_title,
    mp_opp.user_id        AS opponent_id,
    opp.nickname          AS opponent_nickname,
    opp.avatar_url        AS opponent_avatar_url,
    mp_self.mmr_change    AS my_mmr_change,
    m.end_time,
    m.created_at
  FROM match_participants mp_self
  JOIN matches m
    ON m.id = mp_self.match_id AND m.status = 'finished'
  LEFT JOIN LATERAL (
    SELECT mp.user_id
    FROM match_participants mp
    WHERE mp.match_id = m.id AND mp.user_id <> p_user_id
    LIMIT 1
  ) mp_opp ON true
  LEFT JOIN profiles opp
    ON opp.id = mp_opp.user_id
  LEFT JOIN problems pr
    ON pr.id = m.problem_id
  WHERE mp_self.user_id = p_user_id
  ORDER BY m.end_time DESC NULLS LAST, m.created_at DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_match_history(uuid, integer) FROM public;
REVOKE ALL ON FUNCTION public.get_match_history(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_history(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_match_history(uuid, integer) IS
  'Post-MVP A-5: 특정 유저의 finished 매치 히스토리 (상대/문제/결과/MMR변동, RLS 우회, authenticated 전용).';
