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
-- 조치: anon_insert(WITH CHECK true) 를 DROP 하고, authenticated 한정 + 위조 차단 정책으로 교체.
--   (a) 는 host_id = auth.uid() 라 WITH CHECK 통과 → 회귀 없음. (b) 는 service-role 이라 RLS 무관.
--
-- WITH CHECK 강화 (P2 — PR #37 코드리뷰 후속): host_id(WHO) 뿐 아니라 INSERT 컬럼 값(WHAT)도 검증한다.
--   배경: host_id 만 검사하면 인증 유저가 PostgREST 로 `status='finished', winner_id=self` 인 matches row +
--   본인 match_participants row 를 직접 INSERT 해 가짜 승리 전적을 만들 수 있다(get_profile_stats /
--   get_leaderboard 가 winner_id 집계로 wins 를 셈 → 프로필/리더보드 전적 표시 오염. MMR 은 rating 보호
--   트리거로 안전, 정렬 순위는 불변이라 P2). BEFORE UPDATE 트리거(prevent_protected_matches_update)는
--   UPDATE 만 보호하고 INSERT 는 통과하므로 RLS WITH CHECK 에서 막아야 한다(FRONTEND_REVIEW.md 패턴).
--   정상 매치는 항상 'waiting' + winner_id NULL 로 시작한다(invite route 실측: status=MATCH_STATUS.WAITING,
--   winner_id 미지정). 따라서 아래 조건은 정상 생성은 통과시키고 위조만 차단한다.
--
-- 멱등 + 시작 상태 2가지 모두 처리: 아래 두 DROP IF EXISTS 가 어느 출발점이든 강화 정책으로 수렴시킨다.
--   (1) fresh `db push` 재배포 타임라인: 이 마이그레이션 시점의 INSERT 정책은 `anon_insert`(roles {public},
--       WITH CHECK true)다. 첫 DROP 이 이를 제거한다.
--   (2) 라이브 프로덕션 타임라인: 본 파일의 약한 1차 버전(`matches_host_insert`, host_id 만 검사)이 수동
--       선적용된 상태(B-4 — schema_migrations 미기록). 두 번째 DROP 이 이를 제거한다.
--   어느 경우든 마지막 CREATE 로 강화된 `matches_host_insert`(host_id + status='waiting' + winner_id IS NULL)
--   가 최종 상태가 된다. 재실행 안전.

BEGIN;

-- (1) fresh 재배포: 기존 anon_insert(WITH CHECK true) 제거
DROP POLICY IF EXISTS "anon_insert" ON public.matches;

-- (2) 라이브 프로덕션: 수동 선적용된 약한 matches_host_insert(host_id only) 제거 + 멱등 재실행 대비
DROP POLICY IF EXISTS "matches_host_insert" ON public.matches;

CREATE POLICY "matches_host_insert"
  ON public.matches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    host_id = auth.uid()
    AND status = 'waiting'
    AND winner_id IS NULL
  );

COMMIT;
