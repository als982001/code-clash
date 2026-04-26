-- PR: chore/step3-followup-fixes (Code Reviewer I-5 후속)
-- test_cases 시드 멱등성을 ON CONFLICT 패턴으로 단순화하기 위한 사전 작업.
-- (problem_id, input, is_hidden) 조합이 동일한 케이스는 의미상 동일하므로 UNIQUE 제약을 부여한다.
-- 운영 DB 사전 검증: 중복 0건 확인 완료 (2026-04-26).

ALTER TABLE public.test_cases
  ADD CONSTRAINT test_cases_problem_input_hidden_uniq
  UNIQUE (problem_id, input, is_hidden);
