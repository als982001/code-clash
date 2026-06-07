-- ============================================================================
-- problems.description(단일 마크다운) → 구조화 컬럼 분리
--   description    : "문제 설명" 본문만 (컬럼 재활용)
--   input_format   : "입력 형식" (신규)
--   output_format  : "출력 형식" (신규)
--   examples       : [{ input, output, explanation? }] JSONB 배열 (신규, 다중 예시 지원)
--
-- 안전 설계:
--   1) 백필 전 원본 description 백업 테이블 생성 (롤백 대비)
--   2) 컬럼 ADD COLUMN IF NOT EXISTS (멱등)
--   3) id 기준 명시 UPDATE 9건 (problems 행 미삭제 → matches/test_cases FK 무영향)
--   4) 백필 검증 통과 후 input_format/output_format NOT NULL
--   전체를 트랜잭션으로 묶어 NOT NULL 실패 시 전체 롤백
--
-- #8 계단 오르기 / #9 LIS 의 "### 설명" 블록은 examples[].explanation 으로 보존
-- ============================================================================

BEGIN;

-- 1) 원본 백업 (안정화 후 DROP)
CREATE TABLE IF NOT EXISTS public.problems_description_backup_20260606 AS
SELECT id, description FROM public.problems;

-- 백업 테이블은 RLS/GRANT 기본값이라 노출 위험 → default deny + anon/authenticated 회수
ALTER TABLE public.problems_description_backup_20260606 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.problems_description_backup_20260606 FROM anon, authenticated;

-- 2) 컬럼 추가 (멱등)
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS input_format  TEXT,
  ADD COLUMN IF NOT EXISTS output_format TEXT,
  ADD COLUMN IF NOT EXISTS examples      JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3) 백필 (id 기준 명시 UPDATE)

-- #1 두 수의 합
UPDATE public.problems SET
  description   = $d$두 정수 A와 B가 주어졌을 때, A + B를 출력하세요.$d$,
  input_format  = $i$첫째 줄에 두 정수 A와 B가 공백으로 구분되어 주어집니다.

- -10,000 ≤ A, B ≤ 10,000$i$,
  output_format = $o$A + B의 값을 출력하세요.$o$,
  examples      = $e$[{"input": "3 5", "output": "8"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000001';

-- #2 배열의 최댓값
UPDATE public.problems SET
  description   = $d$N개의 정수가 주어졌을 때, 가장 큰 값을 출력하세요.$d$,
  input_format  = $i$첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -1,000,000 ≤ 각 정수 ≤ 1,000,000$i$,
  output_format = $o$N개의 정수 중 가장 큰 값을 출력하세요.$o$,
  examples      = $e$[{"input": "5\n3 1 7 2 5", "output": "7"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000002';

-- #3 문자열 뒤집기
UPDATE public.problems SET
  description   = $d$문자열이 주어졌을 때, 문자열을 뒤집어 출력하세요.$d$,
  input_format  = $i$첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 1,000)
문자열은 영문 소문자로만 구성됩니다.$i$,
  output_format = $o$뒤집은 문자열을 출력하세요.$o$,
  examples      = $e$[{"input": "hello", "output": "olleh"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000003';

-- #4 짝수의 합
UPDATE public.problems SET
  description   = $d$N개의 정수가 주어졌을 때, 그 중 짝수만 골라 합을 구하세요.
짝수가 하나도 없으면 0을 출력합니다.$d$,
  input_format  = $i$첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -100,000 ≤ 각 정수 ≤ 100,000$i$,
  output_format = $o$짝수의 합을 출력하세요.$o$,
  examples      = $e$[{"input": "5\n1 2 3 4 5", "output": "6"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000004';

-- #5 유효한 괄호
UPDATE public.problems SET
  description   = $d$괄호로만 이루어진 문자열이 주어졌을 때, 괄호의 짝이 올바르게 맞는지 판별하세요.

사용되는 괄호는 `()`, `{}`, `[]` 세 종류입니다.

올바른 괄호 문자열의 조건:
- 여는 괄호는 같은 종류의 닫는 괄호로 닫혀야 합니다.
- 여는 괄호는 올바른 순서로 닫혀야 합니다.$d$,
  input_format  = $i$첫째 줄에 괄호 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)$i$,
  output_format = $o$올바른 괄호 문자열이면 `true`, 아니면 `false`를 출력하세요.$o$,
  examples      = $e$[{"input": "()[]{}", "output": "true"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000005';

-- #6 중복 문자 제거
UPDATE public.problems SET
  description   = $d$문자열이 주어졌을 때, 중복된 문자를 제거하고 처음 등장한 순서를 유지하여 출력하세요.$d$,
  input_format  = $i$첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)
문자열은 영문 소문자로만 구성됩니다.$i$,
  output_format = $o$중복이 제거된 문자열을 출력하세요.$o$,
  examples      = $e$[{"input": "programming", "output": "progamin"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000006';

-- #7 두 수의 합 (인덱스)
UPDATE public.problems SET
  description   = $d$정수 배열과 목표값 target이 주어졌을 때, 합이 target이 되는 두 원소의 인덱스를 찾아 출력하세요.

각 입력에 정확히 하나의 정답이 존재하며, 같은 원소를 두 번 사용할 수 없습니다.
두 인덱스는 오름차순으로 출력합니다. (0-based index)$d$,
  input_format  = $i$첫째 줄에 배열의 크기 N과 목표값 target이 공백으로 구분되어 주어집니다. (2 ≤ N ≤ 10,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.$i$,
  output_format = $o$합이 target이 되는 두 인덱스를 공백으로 구분하여 출력하세요.$o$,
  examples      = $e$[{"input": "4 9\n2 7 11 15", "output": "0 1"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000007';

-- #8 계단 오르기 ("### 설명" → examples[].explanation)
UPDATE public.problems SET
  description   = $d$N개의 계단이 있습니다. 한 번에 1칸 또는 2칸을 오를 수 있을 때, 꼭대기에 도달하는 방법의 수를 구하세요.$d$,
  input_format  = $i$첫째 줄에 계단의 수 N이 주어집니다. (1 ≤ N ≤ 45)$i$,
  output_format = $o$꼭대기에 도달하는 방법의 수를 출력하세요.$o$,
  examples      = $e$[{"input": "4", "output": "5", "explanation": "4칸을 오르는 방법:\n- 1+1+1+1\n- 1+1+2\n- 1+2+1\n- 2+1+1\n- 2+2\n\n총 5가지"}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000008';

-- #9 최장 증가 부분 수열 ("### 설명" → examples[].explanation)
UPDATE public.problems SET
  description   = $d$정수 배열이 주어졌을 때, 가장 긴 증가하는 부분 수열(LIS)의 길이를 구하세요.

부분 수열이란 원래 배열에서 일부 원소를 골라 순서를 유지한 것입니다.
증가하는 부분 수열이란 선택한 원소들이 순서대로 증가하는 것입니다.$d$,
  input_format  = $i$첫째 줄에 배열의 크기 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -10,000 ≤ 각 정수 ≤ 10,000$i$,
  output_format = $o$최장 증가 부분 수열의 길이를 출력하세요.$o$,
  examples      = $e$[{"input": "6\n10 9 2 5 3 7", "output": "3", "explanation": "가장 긴 증가하는 부분 수열은 [2, 3, 7] 또는 [2, 5, 7]로 길이는 3입니다."}]$e$::jsonb
WHERE id = 'a1000000-0000-0000-0000-000000000009';

-- 4) 백필 검증 (9건 전부 분리되었는지 — desc_head 에 '##' 없어야 정상)
SELECT
  id,
  left(description, 24)            AS desc_head,
  input_format  IS NOT NULL        AS ok_input,
  output_format IS NOT NULL        AS ok_output,
  jsonb_typeof(examples)           AS ex_type,
  jsonb_array_length(examples)     AS ex_count
FROM public.problems
ORDER BY created_at;

-- 4-1) 백필 자동 검증 (눈으로 못 보고 넘어가도 미분리/누락 시 트랜잭션 자동 중단)
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT count(*) INTO bad_count
  FROM public.problems
  WHERE input_format IS NULL
     OR output_format IS NULL
     OR jsonb_typeof(examples) <> 'array'
     OR description ~ '(^|\n)## ';  -- 분리 후 description 에 마크다운 헤딩이 남으면 비정상

  IF bad_count > 0 THEN
    RAISE EXCEPTION '백필 검증 실패: % 건 (미분리/누락)', bad_count;
  END IF;
END $$;

-- 5) NOT NULL 제약 (백필 누락 시 여기서도 실패 → 트랜잭션 전체 롤백)
ALTER TABLE public.problems
  ALTER COLUMN input_format  SET NOT NULL,
  ALTER COLUMN output_format SET NOT NULL;

COMMIT;

-- 안정화 확인 후 별도 실행:
--   DROP TABLE IF EXISTS public.problems_description_backup_20260606;
