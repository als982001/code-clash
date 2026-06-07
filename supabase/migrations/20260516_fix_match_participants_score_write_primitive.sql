-- score write primitive fix — match_participants.self_update 정책 제거
--
-- 배경: 같은 일자에 도입된 `20260516_match_participants_self_update.sql` 이
-- self_update 정책(user_id = auth.uid())을 만들었고, 동반된 BEFORE UPDATE 트리거
-- prevent_protected_match_participants_update 의 보호 컬럼 목록에서 score 를
-- 의도적으로 제외하여 인가 사용자가 PostgREST PATCH 로 자기 row 의 score 를
-- 임의 값으로 덮어쓸 수 있는 score write primitive 가 노출되어 있었다 (HIGH 보안 결함).
--
-- 해결: self_update 정책 자체를 DROP 하여 match_participants 의 인가 사용자 UPDATE 를
-- default deny 로 되돌린다. submit/route.ts 의 score 갱신은 같은 라우트에서 이미
-- 만들고 있던 service-role 클라이언트로 전환되어 RLS 를 우회해 1 row 영향 받는다.
-- BEFORE UPDATE 트리거는 그대로 유지 — service-role 흐름은 auth.role() = 'service_role'
-- 분기로 우회하고, 인가 사용자 흐름은 RLS 가 먼저 deny 하므로 트리거에 도달하지 않는다.
--
-- 운영 적용 순서: 이 마이그레이션 적용 직후 PR #16 머지(submit 라우트 코드 변경 포함).
-- 적용 전 코드 머지 시 모든 submit 요청이 RLS deny 로 0 rows updated 가드에 걸려 500.

DROP POLICY IF EXISTS "self_update" ON public.match_participants;
