export interface IJudgeResult {
  token: string;
  status: {
    id: number;
    description: string;
  };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string | null;
  memory: number | null;
}

export interface ITestCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  passed: boolean;
  error: string | null;
  time: string | null;
  memory: number | null;
}

export interface IJudgeResponse {
  results: ITestCaseResult[];
  totalPassed: number;
  totalCases: number;
}

export interface IOpponentProgress {
  passedCount: number;
  totalCount: number;
}
