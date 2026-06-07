-- PR: fix/db-rls-and-seed
-- 시드 데이터 SoT 마이그레이션 (멱등성). 운영 DB에는 이미 동일 데이터가 들어있다.
-- 이 파일은 신규 환경 부트스트랩 + 회귀 방어용.
-- 모든 INSERT는 중복 시 silent skip.

-- =============================================================================
-- problems (9건)
-- PK = id 충돌 시 skip
-- =============================================================================

-- Level 1 — 두 수의 합
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '두 수의 합',
  $desc$## 문제 설명

두 정수 A와 B가 주어졌을 때, A + B를 출력하세요.

## 입력 형식

첫째 줄에 두 정수 A와 B가 공백으로 구분되어 주어집니다.

- -10,000 ≤ A, B ≤ 10,000

## 출력 형식

A + B의 값을 출력하세요.

## 예시

### 입력
```
3 5
```

### 출력
```
8
```$desc$,
  'Level 1',
  2000,
  256000,
  ARRAY['Math']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 1 — 배열의 최댓값
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000002',
  '배열의 최댓값',
  $desc$## 문제 설명

N개의 정수가 주어졌을 때, 가장 큰 값을 출력하세요.

## 입력 형식

첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -1,000,000 ≤ 각 정수 ≤ 1,000,000

## 출력 형식

N개의 정수 중 가장 큰 값을 출력하세요.

## 예시

### 입력
```
5
3 1 7 2 5
```

### 출력
```
7
```$desc$,
  'Level 1',
  2000,
  256000,
  ARRAY['Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 1 — 문자열 뒤집기
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000003',
  '문자열 뒤집기',
  $desc$## 문제 설명

문자열이 주어졌을 때, 문자열을 뒤집어 출력하세요.

## 입력 형식

첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 1,000)
문자열은 영문 소문자로만 구성됩니다.

## 출력 형식

뒤집은 문자열을 출력하세요.

## 예시

### 입력
```
hello
```

### 출력
```
olleh
```$desc$,
  'Level 1',
  2000,
  256000,
  ARRAY['String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 1 — 짝수의 합
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000004',
  '짝수의 합',
  $desc$## 문제 설명

N개의 정수가 주어졌을 때, 그 중 짝수만 골라 합을 구하세요.
짝수가 하나도 없으면 0을 출력합니다.

## 입력 형식

첫째 줄에 정수의 개수 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -100,000 ≤ 각 정수 ≤ 100,000

## 출력 형식

짝수의 합을 출력하세요.

## 예시

### 입력
```
5
1 2 3 4 5
```

### 출력
```
6
```$desc$,
  'Level 1',
  2000,
  256000,
  ARRAY['Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 2 — 유효한 괄호
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000005',
  '유효한 괄호',
  $desc$## 문제 설명

괄호로만 이루어진 문자열이 주어졌을 때, 괄호의 짝이 올바르게 맞는지 판별하세요.

사용되는 괄호는 `()`, `{}`, `[]` 세 종류입니다.

올바른 괄호 문자열의 조건:
- 여는 괄호는 같은 종류의 닫는 괄호로 닫혀야 합니다.
- 여는 괄호는 올바른 순서로 닫혀야 합니다.

## 입력 형식

첫째 줄에 괄호 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)

## 출력 형식

올바른 괄호 문자열이면 `true`, 아니면 `false`를 출력하세요.

## 예시

### 입력
```
()[]{}
```

### 출력
```
true
```$desc$,
  'Level 2',
  2000,
  256000,
  ARRAY['Stack', 'String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 2 — 중복 문자 제거
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000006',
  '중복 문자 제거',
  $desc$## 문제 설명

문자열이 주어졌을 때, 중복된 문자를 제거하고 처음 등장한 순서를 유지하여 출력하세요.

## 입력 형식

첫째 줄에 문자열 S가 주어집니다. (1 ≤ S의 길이 ≤ 10,000)
문자열은 영문 소문자로만 구성됩니다.

## 출력 형식

중복이 제거된 문자열을 출력하세요.

## 예시

### 입력
```
programming
```

### 출력
```
progamin
```$desc$,
  'Level 2',
  2000,
  256000,
  ARRAY['Hash', 'String']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 2 — 두 수의 합 (인덱스)
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000007',
  '두 수의 합 (인덱스)',
  $desc$## 문제 설명

정수 배열과 목표값 target이 주어졌을 때, 합이 target이 되는 두 원소의 인덱스를 찾아 출력하세요.

각 입력에 정확히 하나의 정답이 존재하며, 같은 원소를 두 번 사용할 수 없습니다.
두 인덱스는 오름차순으로 출력합니다. (0-based index)

## 입력 형식

첫째 줄에 배열의 크기 N과 목표값 target이 공백으로 구분되어 주어집니다. (2 ≤ N ≤ 10,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

## 출력 형식

합이 target이 되는 두 인덱스를 공백으로 구분하여 출력하세요.

## 예시

### 입력
```
4 9
2 7 11 15
```

### 출력
```
0 1
```$desc$,
  'Level 2',
  2000,
  256000,
  ARRAY['Array', 'Hash']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 3 — 계단 오르기
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000008',
  '계단 오르기',
  $desc$## 문제 설명

N개의 계단이 있습니다. 한 번에 1칸 또는 2칸을 오를 수 있을 때, 꼭대기에 도달하는 방법의 수를 구하세요.

## 입력 형식

첫째 줄에 계단의 수 N이 주어집니다. (1 ≤ N ≤ 45)

## 출력 형식

꼭대기에 도달하는 방법의 수를 출력하세요.

## 예시

### 입력
```
4
```

### 출력
```
5
```

### 설명

4칸을 오르는 방법:
- 1+1+1+1
- 1+1+2
- 1+2+1
- 2+1+1
- 2+2

총 5가지$desc$,
  'Level 3',
  2000,
  256000,
  ARRAY['DP']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- Level 3 — 최장 증가 부분 수열
INSERT INTO public.problems (id, title, description, difficulty, time_limit, memory_limit, tags, is_ai_generated)
VALUES (
  'a1000000-0000-0000-0000-000000000009',
  '최장 증가 부분 수열',
  $desc$## 문제 설명

정수 배열이 주어졌을 때, 가장 긴 증가하는 부분 수열(LIS)의 길이를 구하세요.

부분 수열이란 원래 배열에서 일부 원소를 골라 순서를 유지한 것입니다.
증가하는 부분 수열이란 선택한 원소들이 순서대로 증가하는 것입니다.

## 입력 형식

첫째 줄에 배열의 크기 N이 주어집니다. (1 ≤ N ≤ 1,000)
둘째 줄에 N개의 정수가 공백으로 구분되어 주어집니다.

- -10,000 ≤ 각 정수 ≤ 10,000

## 출력 형식

최장 증가 부분 수열의 길이를 출력하세요.

## 예시

### 입력
```
6
10 9 2 5 3 7
```

### 출력
```
3
```

### 설명

가장 긴 증가하는 부분 수열은 [2, 3, 7] 또는 [2, 5, 7]로 길이는 3입니다.$desc$,
  'Level 3',
  2000,
  256000,
  ARRAY['DP', 'Array']::text[],
  false
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- test_cases (42건)
-- UNIQUE 제약이 없으므로 (problem_id, input, is_hidden) 조합으로 NOT EXISTS 가드
-- =============================================================================

-- ----- problem 1 (두 수의 합) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000001', '3 5', '8', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000001' AND input = '3 5' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000001', '-3 7', '4', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000001' AND input = '-3 7' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000001', '0 0', '0', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000001' AND input = '0 0' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000001', '-10000 10000', '0', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000001' AND input = '-10000 10000' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000001', '9999 1', '10000', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000001' AND input = '9999 1' AND is_hidden = true
);

-- ----- problem 2 (배열의 최댓값) — visible 3 + hidden 1 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000002', E'5\n3 1 7 2 5', '7', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000002' AND input = E'5\n3 1 7 2 5' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000002', E'1\n42', '42', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000002' AND input = E'1\n42' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000002', E'3\n-1 -5 -3', '-1', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000002' AND input = E'3\n-1 -5 -3' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000002', E'4\n1000000 -1000000 0 999999', '1000000', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000002' AND input = E'4\n1000000 -1000000 0 999999' AND is_hidden = true
);

-- ----- problem 3 (문자열 뒤집기) — visible 3 + hidden 1 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000003', 'hello', 'olleh', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000003' AND input = 'hello' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000003', 'a', 'a', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000003' AND input = 'a' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000003', 'abcde', 'edcba', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000003' AND input = 'abcde' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000003', 'racecar', 'racecar', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000003' AND input = 'racecar' AND is_hidden = true
);

-- ----- problem 4 (짝수의 합) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000004', E'5\n1 2 3 4 5', '6', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000004' AND input = E'5\n1 2 3 4 5' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000004', E'3\n1 3 5', '0', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000004' AND input = E'3\n1 3 5' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000004', E'4\n2 4 6 8', '20', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000004' AND input = E'4\n2 4 6 8' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000004', E'1\n0', '0', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000004' AND input = E'1\n0' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000004', E'3\n-2 -4 3', '-6', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000004' AND input = E'3\n-2 -4 3' AND is_hidden = true
);

-- ----- problem 5 (유효한 괄호) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000005', '()[]{}', 'true', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000005' AND input = '()[]{}' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000005', '(]', 'false', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000005' AND input = '(]' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000005', '{[()]}', 'true', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000005' AND input = '{[()]}' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000005', '((()))', 'true', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000005' AND input = '((()))' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000005', '([)]', 'false', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000005' AND input = '([)]' AND is_hidden = true
);

-- ----- problem 6 (중복 문자 제거) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000006', 'programming', 'progamin', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000006' AND input = 'programming' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000006', 'abcabc', 'abc', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000006' AND input = 'abcabc' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000006', 'hello', 'helo', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000006' AND input = 'hello' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000006', 'aaaaaa', 'a', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000006' AND input = 'aaaaaa' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000006', 'abcdefg', 'abcdefg', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000006' AND input = 'abcdefg' AND is_hidden = true
);

-- ----- problem 7 (두 수의 합 — 인덱스) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000007', E'4 9\n2 7 11 15', '0 1', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000007' AND input = E'4 9\n2 7 11 15' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000007', E'3 6\n3 2 4', '1 2', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000007' AND input = E'3 6\n3 2 4' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000007', E'2 6\n3 3', '0 1', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000007' AND input = E'2 6\n3 3' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000007', E'4 0\n-1 0 1 2', '0 2', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000007' AND input = E'4 0\n-1 0 1 2' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000007', E'5 10\n1 2 3 7 8', '1 4', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000007' AND input = E'5 10\n1 2 3 7 8' AND is_hidden = true
);

-- ----- problem 8 (계단 오르기) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000008', '4', '5', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000008' AND input = '4' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000008', '1', '1', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000008' AND input = '1' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000008', '2', '2', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000008' AND input = '2' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000008', '10', '89', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000008' AND input = '10' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000008', '45', '1836311903', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000008' AND input = '45' AND is_hidden = true
);

-- ----- problem 9 (최장 증가 부분 수열) — visible 3 + hidden 2 -----
INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000009', E'6\n10 9 2 5 3 7', '3', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000009' AND input = E'6\n10 9 2 5 3 7' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000009', E'4\n1 2 3 4', '4', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000009' AND input = E'4\n1 2 3 4' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000009', E'5\n5 4 3 2 1', '1', false
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000009' AND input = E'5\n5 4 3 2 1' AND is_hidden = false
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000009', E'1\n7', '1', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000009' AND input = E'1\n7' AND is_hidden = true
);

INSERT INTO public.test_cases (problem_id, input, expected_output, is_hidden)
SELECT 'a1000000-0000-0000-0000-000000000009', E'8\n3 1 4 1 5 9 2 6', '4', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.test_cases
  WHERE problem_id = 'a1000000-0000-0000-0000-000000000009' AND input = E'8\n3 1 4 1 5 9 2 6' AND is_hidden = true
);
