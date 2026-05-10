-- PR 리뷰 지적 fix:
-- matches.invite_token이 anon에 노출되면 매치 hijack이 가능하다.
-- public_read USING (true)를 호스트/참가자 한정으로 좁히고,
-- /invite/[token] 페이지가 비로그인에서도 매치 정보를 가져와야 하므로
-- 토큰 조회는 SECURITY DEFINER RPC로 분리한다 (반환 컬럼에서 invite_token 제외).

-- ── matches ──────────────────────────────────────────────
DROP POLICY IF EXISTS "public_read" ON public.matches;

CREATE POLICY "matches_self_or_participant_read"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = matches.id
        AND mp.user_id = auth.uid()
    )
  );

-- ── match_participants ───────────────────────────────────
-- 같은 매치의 참가자끼리만 서로의 row를 볼 수 있게 좁힘.
-- (자기 row + 자신이 참여한 매치의 다른 참가자 row)
DROP POLICY IF EXISTS "match_read" ON public.match_participants;

CREATE POLICY "match_participants_co_participant_read"
  ON public.match_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.match_participants mp
      WHERE mp.match_id = match_participants.match_id
        AND mp.user_id = auth.uid()
    )
  );

-- ── profiles ─────────────────────────────────────────────
-- anon 차단. authenticated 한정 SELECT.
-- (추후 매치 참가자 한정으로 더 좁힐 여지 있음)
DROP POLICY IF EXISTS "public_read" ON public.profiles;

CREATE POLICY "profiles_authenticated_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- ── 토큰 조회용 SECURITY DEFINER RPC ────────────────────
-- /invite/[token] 페이지가 비로그인 상태에서도 호출 가능해야 하므로 anon에도 EXECUTE 부여.
-- 반환 컬럼에서 invite_token을 제외해 토큰 자체는 절대 노출되지 않음.
CREATE OR REPLACE FUNCTION public.get_invite_match_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  status text,
  host_id uuid,
  invite_expires_at timestamptz,
  participant_count int
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT
    m.id,
    m.status,
    m.host_id,
    m.invite_expires_at,
    (SELECT COUNT(*)::int FROM public.match_participants mp WHERE mp.match_id = m.id) AS participant_count
  FROM public.matches m
  WHERE m.invite_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invite_match_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_match_by_token(text) TO anon, authenticated;
