-- ============================================================================
-- 구조화 컬럼(description/input_format/output_format/examples) 기반 problems 시드
--   신규 환경 부트스트랩 + 회귀 방어용 (멱등).
--   기존 20260426_seed_problems.sql 은 단일 마크다운 description 시절 시드라
--   신규 환경에서는 이 파일을 사용한다. (id 충돌 시 silent skip)
--
--   [언제 실행하나]
--   - 신규 Supabase 환경 셋업 시: problems 테이블 생성(구조화 컬럼 포함) 직후 1회 실행
--     → 9개 문제가 새 구조로 부트스트랩됨. (docs/SUPABASE_SETUP.md 5-1 참고)
--   - 기존 운영 DB: 이미 9개가 존재하고 ON CONFLICT (id) DO NOTHING 이므로
--     실행 불필요. 실행해도 전부 skip 되어 무해(데이터 변경 없음).
--   - 즉 "기존 DB 갱신"이 아니라 "빈 DB 채우기"용. 기존 데이터 분리는
--     20260606_problems_structured_columns.sql(백필)이 담당했다.
--
--   - description    : "문제 설명" 본문만
--   - input_format   : "입력 형식"
--   - output_format  : "출력 형식"
--   - examples       : [{ input, output, explanation? }] JSONB 배열 (다중 예시 지원)
--   값 출처: 20260606_problems_structured_columns.sql (분리 데이터) +
--            20260426_seed_problems.sql (id/title/difficulty/limit/tags)
-- ============================================================================

-- #1 두 수의 합
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '두 수의 합',
  $d$두 정수 A와 B가 주어졌을 때, A + B를 출력하세요.$d$,
  $i$첫째 줄에 두 정수 A와 B가 공백으로 구분되어 주어집니다.

- -10,000 ≤ A, B ≤ 10,000$i$,
  $o$A + B의 값을 출력하세요.$o$,
  $e$[{"input": "3 5", "output": "8"}]$e$::jsonb,
  'Level 1',
  2000,
  256000,
  ARRAY['Math']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #2 배열의 최댓값
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  '배열의 최댓값',
  $d$N개의 정수가 주어졌을 때, 가장 큰 값을 출력하세요.$d$,
  $i$첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -1,000,000 ≤ 각 정수 ≤ 1,000,000$i$,
  $o$N개의 정수 중 가장 큰 값을 출력하세요.$o$,
  $e$[{"input": "5\n3 1 7 2 5", "output": "7"}]$e$::jsonb,
  'Level 1',
  2000,
  256000,
  ARRAY['Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #3 문자열 뒤집기
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  '문자열 뒤집기',
  $d$문자열이 주어졌을 때, 문자열을 뒤집어 출력하세요.$d$,
  $i$첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 1,000)
문자열은 영문 소문자로만 구성됩니다.$i$,
  $o$뒤집은 문자열을 출력하세요.$o$,
  $e$[{"input": "hello", "output": "olleh"}]$e$::jsonb,
  'Level 1',
  2000,
  256000,
  ARRAY['String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #4 짝수의 합
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  '짝수의 합',
  $d$N개의 정수가 주어졌을 때, 그 중 짝수만 골라 합을 구하세요.
짝수가 하나도 없으면 0을 출력합니다.$d$,
  $i$첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -100,000 ≤ 각 정수 ≤ 100,000$i$,
  $o$짝수의 합을 출력하세요.$o$,
  $e$[{"input": "5\n1 2 3 4 5", "output": "6"}]$e$::jsonb,
  'Level 1',
  2000,
  256000,
  ARRAY['Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #5 유효한 괄호
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  '유효한 괄호',
  $d$괄호로만 이루어진 문자열이 주어졌을 때, 괄호의 짝이 올바르게 맞는지 판별하세요.

사용되는 괄호는 `()`, `{}`, `[]` 세 종류입니다.

올바른 괄호 문자열의 조건:
- 여는 괄호는 같은 종류의 닫는 괄호로 닫혀야 합니다.
- 여는 괄호는 올바른 순서로 닫혀야 합니다.$d$,
  $i$첫째 줄에 괄호 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)$i$,
  $o$올바른 괄호 문자열이면 `true`, 아니면 `false`를 출력하세요.$o$,
  $e$[{"input": "()[]{}", "output": "true"}]$e$::jsonb,
  'Level 2',
  2000,
  256000,
  ARRAY['Stack', 'String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #6 중복 문자 제거
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  '중복 문자 제거',
  $d$문자열이 주어졌을 때, 중복된 문자를 제거하고 처음 등장한 순서를 유지하여 출력하세요.$d$,
  $i$첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)
문자열은 영문 소문자로만 구성됩니다.$i$,
  $o$중복이 제거된 문자열을 출력하세요.$o$,
  $e$[{"input": "programming", "output": "progamin"}]$e$::jsonb,
  'Level 2',
  2000,
  256000,
  ARRAY['Hash', 'String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #7 두 수의 합 (인덱스)
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000007',
  '두 수의 합 (인덱스)',
  $d$정수 배열과 목표값 target이 주어졌을 때, 합이 target이 되는 두 원소의 인덱스를 찾아 출력하세요.

각 입력에 정확히 하나의 정답이 존재하며, 같은 원소를 두 번 사용할 수 없습니다.
두 인덱스는 오름차순으로 출력합니다. (0-based index)$d$,
  $i$첫째 줄에 배열의 크기 N과 목표값 target이 공백으로 구분되어 주어집니다. (2 ≤ N ≤ 10,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.$i$,
  $o$합이 target이 되는 두 인덱스를 공백으로 구분하여 출력하세요.$o$,
  $e$[{"input": "4 9\n2 7 11 15", "output": "0 1"}]$e$::jsonb,
  'Level 2',
  2000,
  256000,
  ARRAY['Array', 'Hash']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #8 계단 오르기 (examples[].explanation 보유)
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000008',
  '계단 오르기',
  $d$N개의 계단이 있습니다. 한 번에 1칸 또는 2칸을 오를 수 있을 때, 꼭대기에 도달하는 방법의 수를 구하세요.$d$,
  $i$첫째 줄에 계단의 수 N이 주어집니다. (1 ≤ N ≤ 45)$i$,
  $o$꼭대기에 도달하는 방법의 수를 출력하세요.$o$,
  $e$[{"input": "4", "output": "5", "explanation": "4칸을 오르는 방법:\n- 1+1+1+1\n- 1+1+2\n- 1+2+1\n- 2+1+1\n- 2+2\n\n총 5가지"}]$e$::jsonb,
  'Level 3',
  2000,
  256000,
  ARRAY['DP']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- #9 최장 증가 부분 수열 (examples[].explanation 보유)
INSERT INTO public.problems (id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000009',
  '최장 증가 부분 수열',
  $d$정수 배열이 주어졌을 때, 가장 긴 증가하는 부분 수열(LIS)의 길이를 구하세요.

부분 수열이란 원래 배열에서 일부 원소를 골라 순서를 유지한 것입니다.
증가하는 부분 수열이란 선택한 원소들이 순서대로 증가하는 것입니다.$d$,
  $i$첫째 줄에 배열의 크기 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -10,000 ≤ 각 정수 ≤ 10,000$i$,
  $o$최장 증가 부분 수열의 길이를 출력하세요.$o$,
  $e$[{"input": "6\n10 9 2 5 3 7", "output": "3", "explanation": "가장 긴 증가하는 부분 수열은 [2, 3, 7] 또는 [2, 5, 7]로 길이는 3입니다."}]$e$::jsonb,
  'Level 3',
  2000,
  256000,
  ARRAY['DP', 'Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;
