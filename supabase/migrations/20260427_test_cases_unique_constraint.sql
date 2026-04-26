-- PR: chore/step3-followup-fixes (Code Reviewer I-5 + 외부 리뷰 후속)
-- test_cases 시드 멱등성을 ON CONFLICT 패턴으로 단순화하기 위한 사전 작업.
-- (problem_id, input, is_hidden) 조합이 동일한 케이스는 의미상 동일하므로 UNIQUE 제약을 부여한다.
-- 추가로 is_hidden을 NOT NULL로 고정해 UNIQUE의 NULL 의미론(NULL ≠ NULL) 회귀를 차단한다.
-- 모든 ALTER는 멱등 (재실행 안전 — 사전 IF (NOT) EXISTS 체크).
-- 운영 DB 사전 검증: (problem_id, input, is_hidden) 중복 0건 / is_hidden NULL row 0건 (2026-04-26).

-- ===== is_hidden NOT NULL 보강 =====
-- DEFAULT false는 이미 적용되어 있으나 컬럼이 nullable이라 NULL 명시 INSERT 가능.
-- UNIQUE 제약과 결합 시 NULL row가 중복 차단을 우회하므로 NOT NULL로 잠근다.
DO $$
BEGIN
  IF (
    SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'test_cases'
      AND column_name = 'is_hidden'
  ) = 'YES' THEN
    ALTER TABLE public.test_cases ALTER COLUMN is_hidden SET NOT NULL;
  END IF;
END $$;

-- ===== UNIQUE 제약 추가 =====
-- ADD CONSTRAINT는 IF NOT EXISTS 미지원 + UNIQUE는 내부 인덱스 생성 시 42P07/42710 모두 발생 가능 →
-- pg_constraint 사전 조회로 안전 가드.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'test_cases_problem_input_hidden_uniq'
      AND conrelid = 'public.test_cases'::regclass
  ) THEN
    ALTER TABLE public.test_cases
      ADD CONSTRAINT test_cases_problem_input_hidden_uniq
      UNIQUE (problem_id, input, is_hidden);
  END IF;
END $$;
