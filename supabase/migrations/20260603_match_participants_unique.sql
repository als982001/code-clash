-- match_participants 중복 참가자 DB 방어선 — (match_id, user_id) UNIQUE
--
-- 기존 PK 는 id 단독이라 같은 유저가 같은 매치에 2번 등록되는 것을 DB 가 막지 못했다.
-- invite/join/자동매칭 RPC(find_or_enqueue_match) 모두 (match_id, user_id) 중복 INSERT 를
-- 하지 않지만, 향후 회귀·동시성 엣지케이스의 최후 방어선으로 제약을 추가한다.
-- (자동 매칭 RPC 는 한 트랜잭션에서 서로 다른 두 user_id 를 INSERT 하므로 이 제약과 충돌 없음)
--
-- 적용 전 중복 0건 확인 완료(2026-06-03):
--   SELECT match_id, user_id, count(*) FROM match_participants
--   GROUP BY match_id, user_id HAVING count(*) > 1;  → 0 rows

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'match_participants_match_user_unique'
      AND conrelid = 'public.match_participants'::regclass
  ) THEN
    ALTER TABLE public.match_participants
      ADD CONSTRAINT match_participants_match_user_unique UNIQUE (match_id, user_id);
  END IF;
END $$;

COMMIT;
