-- 20260614_cleanup_stale_matches.sql
--
-- 목적: 테스트 과정에서 누적된 stale 매치(buried row) 정리. (기술 부채 B-5/B-7 실증분)
--
-- 배경 (2026-06-14 Supabase MCP 실측):
--   - matches: ongoing 13건(7~36일 경과) + waiting 9건(7~40일 경과) = 22건이 잔존.
--   - 정상 매치 수명은 15분(MATCH_DURATION_SECONDS=900)이므로 1일 이상 ongoing/waiting 인 row 는
--     매칭/대전이 중단된 채 버려진 테스트 잔재로 단정 가능.
--   - finished 11건(리더보드·전적·대전 히스토리 데이터원)은 보존 대상이므로 삭제 조건에서 제외.
--
-- 삭제 범위 / FK 연쇄 (실측 검증):
--   - 대상 matches 22건.
--   - match_participants 35건: FK `match_participants_match_id_fkey` ON DELETE CASCADE → 자동 삭제.
--   - submissions: 대상 매치 종속 0건(버려진 매치라 제출 없음). FK 는 NO ACTION 이나 0건이라 차단 없음.
--   - ai_reviews / matchmaking_queue: 대상 종속 0건.
--
-- 주의:
--   - 일회성 데이터 정리 마이그레이션(스키마 변경 아님). 재실행해도 그 시점의 stale row 만 삭제되어 안전.
--   - 근본 해결(자동 정리 cron)은 B-5/B-7 로 별도 설계 예정. 본 파일은 현재 누적분 1회 정리.
--   - Studio SQL Editor 직접 실행 시 schema_migrations 미기록(B-4) — 운영 무해.

BEGIN;

WITH deleted AS (
  DELETE FROM public.matches
  WHERE status IN ('ongoing', 'waiting')
    AND created_at < now() - interval '1 day'
  RETURNING id, status
)
SELECT status, count(*) AS deleted_count
FROM deleted
GROUP BY status
ORDER BY status;
-- 예상 결과: ongoing 13 / waiting 9 (= matches 22건, match_participants 35건 CASCADE)

COMMIT;
