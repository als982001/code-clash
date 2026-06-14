-- 20260614_zombie_cleanup_schedule.sql  (2/2 — function 파일 적용 후 실행)
--
-- 목적: cleanup_stale_matches_and_queue() 를 pg_cron 으로 15분마다 호출 등록.
-- 선행: 20260614_zombie_cleanup_function.sql 가 먼저 적용돼 함수가 존재해야 한다.
-- 설계: docs/superpowers/specs/2026-06-14-zombie-cleanup-design.md
--
-- BEGIN/COMMIT 으로 감싸지 않는다 — CREATE EXTENSION pg_cron 은 트랜잭션 블록 안에서
-- 실패할 수 있어 각 문장을 개별(auto-commit) 실행한다. 모든 문장은 멱등이라 재실행 안전.
-- Supabase: pg_cron 미설치 시 대시보드(Database > Extensions)에서 활성화 후 재실행 가능.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 동명 job 멱등 재등록
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-matches') THEN
    PERFORM cron.unschedule('cleanup-stale-matches');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-stale-matches',
  '*/15 * * * *',
  $$SELECT public.cleanup_stale_matches_and_queue()$$
);
