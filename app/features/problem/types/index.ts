export interface ITestCase {
  id: string;
  input: string;
  expected_output: string;
}

export interface IProblem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  tags: string[];
  time_limit: number;
  memory_limit: number;
  testCases: ITestCase[];
}
