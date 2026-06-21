-- 20260614_zombie_cleanup_function.sql  (1/2 — 먼저 적용)
--
-- 목적: stale 좀비 주기 자동 정리 함수 (기술 부채 B-5 만료 waiting / B-7 queue 좀비 + 버려진 ongoing).
-- 짝 파일: 20260614_zombie_cleanup_schedule.sql (pg_cron 등록 — 이 파일 적용 후 실행).
-- 설계: docs/superpowers/specs/2026-06-14-zombie-cleanup-design.md
--
-- 임계값: ongoing 1h / waiting 만료·1h / queue 15min.
-- 제출 있는 stale ongoing 은 삭제 대신 finished 종료(몰수·MMR 변동 없음):
--   distinct 제출자 정확히 1명 → winner, 그 외 → winner_id NULL.
-- 모든 매치 DELETE 에 NOT EXISTS(submissions) 가드 → submissions FK(NO ACTION) 에러 차단.
-- UPDATE 는 status/winner_id/end_time 만 변경 → matches 보호컬럼 트리거 통과(보호 7종에 없음).
--
-- 이 파일은 함수 정의 + 권한만 다루며 BEGIN/COMMIT 으로 원자 적용한다.
-- pg_cron CREATE EXTENSION 은 트랜잭션 안에서 실패할 수 있어 짝 파일로 분리했다.

BEGIN;

CREATE OR REPLACE FUNCTION public.cleanup_stale_matches_and_queue()
RETURNS TABLE (finalized int, deleted_ongoing int, deleted_waiting int, deleted_queue int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_finalized       int := 0;
  v_deleted_ongoing int := 0;
  v_deleted_waiting int := 0;
  v_deleted_queue   int := 0;
BEGIN
  -- ① stale ongoing + 제출 있음 → finished 종료 (몰수·MMR 변동 없음)
  WITH stale_with_sub AS (
    SELECT m.id,
           (SELECT CASE WHEN count(DISTINCT s.user_id) = 1 THEN min(s.user_id) END
              FROM public.submissions s WHERE s.match_id = m.id) AS sole_submitter
    FROM public.matches m
    WHERE m.status = 'ongoing'
      AND COALESCE(m.start_time, m.created_at) < now() - interval '1 hour'
      AND EXISTS (SELECT 1 FROM public.submissions s WHERE s.match_id = m.id)
  ),
  upd AS (
    UPDATE public.matches m
       SET status = 'finished',
           winner_id = sws.sole_submitter,
           end_time = now()
      FROM stale_with_sub sws
     WHERE m.id = sws.id
    RETURNING m.id
  )
  SELECT count(*) INTO v_finalized FROM upd;

  -- ② stale ongoing + 제출 없음 → DELETE (match_participants CASCADE)
  WITH del AS (
    DELETE FROM public.matches m
     WHERE m.status = 'ongoing'
       AND COALESCE(m.start_time, m.created_at) < now() - interval '1 hour'
       AND NOT EXISTS (SELECT 1 FROM public.submissions s WHERE s.match_id = m.id)
    RETURNING m.id
  )
  SELECT count(*) INTO v_deleted_ongoing FROM del;

  -- ③ stale waiting → DELETE
  WITH del AS (
    DELETE FROM public.matches m
     WHERE m.status = 'waiting'
       AND (m.invite_expires_at < now() OR m.created_at < now() - interval '1 hour')
       AND NOT EXISTS (SELECT 1 FROM public.submissions s WHERE s.match_id = m.id)
    RETURNING m.id
  )
  SELECT count(*) INTO v_deleted_waiting FROM del;

  -- ④ stale queue rows → DELETE (matched/waiting 무관, 신선한 시도 <15min 보존)
  WITH del AS (
    DELETE FROM public.matchmaking_queue q
     WHERE q.created_at < now() - interval '15 minutes'
    RETURNING q.id
  )
  SELECT count(*) INTO v_deleted_queue FROM del;

  RETURN QUERY SELECT v_finalized, v_deleted_ongoing, v_deleted_waiting, v_deleted_queue;
END;
$$;

-- 클라이언트 노출 차단 (FRONTEND_REVIEW.md SECURITY DEFINER default grant 함정 회피:
-- PUBLIC 만 REVOKE 하면 anon/authenticated 직접 grant 잔존 → 명시 REVOKE 필수)
REVOKE ALL ON FUNCTION public.cleanup_stale_matches_and_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_stale_matches_and_queue() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_matches_and_queue() TO service_role;

COMMIT;
