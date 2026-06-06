export interface ITestCase {
  id: string;
  input: string;
  expected_output: string;
}

export interface IProblemExample {
  input: string; // 예시 입력 raw 텍스트
  output: string; // 예시 출력 raw 텍스트
  explanation?: string; // 예시 설명 (마크다운, 선택)
}

export interface IProblem {
  id: string;
  title: string;
  description: string; // 문제 설명 본문만
  input_format: string;
  output_format: string;
  examples: IProblemExample[];
  difficulty: string;
  tags: string[];
  time_limit: number;
  memory_limit: number;
  testCases: ITestCase[];
}
