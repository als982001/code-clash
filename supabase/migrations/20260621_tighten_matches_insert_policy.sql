-- 20260621_tighten_matches_insert_policy.sql
--
-- 목적: Supabase 보안 advisor 대응 — matches INSERT write primitive 차단.
-- 배경 (DB 실측):
--   - matches 의 INSERT 정책은 `anon_insert` 단 1개, roles `{public}`(anon + authenticated 를 포함한
--     모든 롤. service_role/postgres 는 어차피 RLS 우회), `WITH CHECK (true)` 로 무제한.
--     비로그인(anon)도 PostgREST 로 임의 host_id/컬럼을 INSERT 가능.
--   - 익명 인증 미사용(auth.users is_anonymous 0건, signInAnonymously 코드 없음) → anon 이 INSERT 할
--     정당한 경로가 실재하지 않는다.
--   - matches INSERT 는 코드상 2경로뿐:
--       (a) invite route(app/api/match/[matchId]... 의 invite/route.ts) — 쿠키세션(authenticated) 으로
--           `host_id = userId(= auth.uid())` 를 명시해 INSERT.
--       (b) 자동매칭 — find_or_enqueue_match RPC(service-role + SECURITY DEFINER) 내부 INSERT → RLS 우회.
--
-- 조치: anon_insert(WITH CHECK true) 를 DROP 하고, authenticated 한정 + host_id 위조 차단 정책으로 교체.
--   (a) 는 host_id = auth.uid() 라 WITH CHECK 통과 → 회귀 없음. (b) 는 service-role 이라 RLS 무관.
--
-- 멱등: DROP ... IF EXISTS + 정책명 신규(matches_host_insert). 재실행 안전.

BEGIN;

DROP POLICY IF EXISTS "anon_insert" ON public.matches;

-- 향후 재실행/충돌 대비: 새 정책도 멱등 처리
DROP POLICY IF EXISTS "matches_host_insert" ON public.matches;

CREATE POLICY "matches_host_insert"
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

COMMIT;
