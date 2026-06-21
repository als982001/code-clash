-- 20260621_revoke_helper_function_exec.sql
--
-- 목적: Supabase 보안 advisor 대응 — 헬퍼/트리거 함수의 불필요한 RPC 노출 축소.
-- 배경: public 스키마 함수는 default privileges 로 anon/authenticated 에 EXECUTE 가 자동 부여되어,
--   클라이언트가 `/rest/v1/rpc/<fn>` 로 직접 호출 가능한 표면이 된다.
--   아래 3개 함수는 클라이언트가 직접 호출할 정당한 경로가 없으므로 해당 grant 를 회수한다.
--
-- 멱등: REVOKE 는 이미 권한이 없어도 에러 없이 통과(no-op). 재실행 안전.
--
-- ⚠️ 주의 — `is_match_participant(uuid)` 는 이 파일에서 건드리지 않는다:
--   해당 함수는 `matches_self_or_participant_read` / `match_participants_co_participant_read`
--   두 RLS 정책의 USING 절에서 호출된다. RLS 표현식 내 함수 호출은 호출자(authenticated) 권한 체크를
--   받으므로 authenticated EXECUTE 를 회수하면 로그인 유저의 matches/match_participants SELECT 가
--   permission denied 로 깨져 /play·/result·매치 폴링이 전면 장애. 따라서 grant 유지.

BEGIN;

-- ① handle_new_user(): auth.users AFTER INSERT 트리거 전용 함수.
--    트리거는 함수 소유자 권한으로 실행되며 호출자 EXECUTE grant 와 무관 → 회수해도 가입 흐름 정상.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ② rls_auto_enable(): event trigger 전용 함수. 동일하게 호출자 EXECUTE 와 무관하게 동작.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, public;

-- ③ get_profile_stats(uuid): 유일 호출처 /profile/[userId] 는 middleware 로 비로그인 차단 →
--    항상 authenticated 컨텍스트에서만 호출된다. anon 경로 없음 → anon 만 회수, authenticated 는 유지.
REVOKE EXECUTE ON FUNCTION public.get_profile_stats(uuid) FROM anon;

COMMIT;

-- 적용 후 검증 (FRONTEND_REVIEW.md: REVOKE FROM PUBLIC 만으론 anon/authenticated 가 안 빠지는 함정 회피용
-- — 이 파일은 anon/authenticated 를 명시 REVOKE 하므로 안전하나, 실제 grantee 를 aclexplode 로 재확인 권장):
--   SELECT p.proname, coalesce(r.rolname,'PUBLIC') AS grantee, a.privilege_type
--   FROM pg_proc p CROSS JOIN LATERAL aclexplode(p.proacl) a
--   LEFT JOIN pg_roles r ON r.oid = a.grantee
--   WHERE p.proname IN ('handle_new_user','rls_auto_enable','get_profile_stats')
--   ORDER BY p.proname, grantee;
-- 기대: handle_new_user/rls_auto_enable = postgres/소유자만, get_profile_stats = authenticated(+postgres/service_role), anon 부재.
