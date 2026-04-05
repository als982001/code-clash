import { NextResponse } from "next/server";

import type {
  IJudgeResponse,
  IJudgeResult,
  ITestCaseResult,
} from "@/app/features/editor/types";

const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_HOST =
  process.env.JUDGE0_API_HOST ?? "judge0-ce.p.rapidapi.com";

const LANGUAGE_ID_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
};

/** Judge0 status.id 정의 */
const JUDGE0_STATUS = {
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  MEMORY_LIMIT: 13,
} as const;

interface ITestCaseInput {
  id: string;
  input: string;
  expected_output: string;
}

interface IJudgeRequestBody {
  code: string;
  language: string;
  testCases: ITestCaseInput[];
}

/**
 * Judge0 status.id를 사람이 읽을 수 있는 에러 메시지로 변환한다.
 * @param statusId Judge0 status.id
 * @return 에러 메시지 또는 null
 */
const getStatusError = ({ statusId }: { statusId: number }): string | null => {
  if (statusId === JUDGE0_STATUS.TIME_LIMIT) {
    return "시간 초과 (Time Limit Exceeded)";
  }

  if (statusId === JUDGE0_STATUS.MEMORY_LIMIT) {
    return "메모리 초과 (Memory Limit Exceeded)";
  }

  if (statusId >= 7 && statusId <= 12) {
    return "런타임 에러 (Runtime Error)";
  }

  if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
    return "컴파일 에러 (Compilation Error)";
  }

  return null;
};

/**
 * 단일 테스트 케이스를 Judge0에 제출하여 결과를 반환한다.
 * @param code 소스코드
 * @param languageId Judge0 언어 ID
 * @param testCase 테스트 케이스
 * @return 테스트 케이스 결과
 */
const executeTestCase = async ({
  code,
  languageId,
  testCase,
}: {
  code: string;
  languageId: number;
  testCase: ITestCaseInput;
}): Promise<ITestCaseResult> => {
  try {
    const judgeResponse = await fetch(
      `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_API_KEY!,
          "X-RapidAPI-Host": JUDGE0_API_HOST,
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expected_output,
          cpu_time_limit: 2,
          memory_limit: 256000,
        }),
      },
    );

    if (!judgeResponse.ok) {
      return {
        testCaseId: testCase.id,
        input: testCase.input,
        expectedOutput: testCase.expected_output,
        actualOutput: null,
        passed: false,
        error: "채점 서버 요청에 실패했습니다.",
        time: null,
        memory: null,
      };
    }

    const judgeResult: IJudgeResult = await judgeResponse.json();

    const statusError = getStatusError({ statusId: judgeResult.status.id });
    const actualOutput = judgeResult.stdout?.trim() ?? null;
    const expectedTrimmed = testCase.expected_output.trim();
    const passed =
      judgeResult.status.id === JUDGE0_STATUS.ACCEPTED &&
      actualOutput === expectedTrimmed;

    return {
      testCaseId: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expected_output,
      actualOutput,
      passed,
      error:
        statusError || judgeResult.stderr || judgeResult.compile_output || null,
      time: judgeResult.time,
      memory: judgeResult.memory,
    };
  } catch (error) {
    console.error(error);

    return {
      testCaseId: testCase.id,
      input: testCase.input,
      expectedOutput: testCase.expected_output,
      actualOutput: null,
      passed: false,
      error: "채점 중 오류가 발생했습니다.",
      time: null,
      memory: null,
    };
  }
};

/**
 * 코드를 Judge0에 제출하여 테스트 케이스별 채점 결과를 반환한다.
 * @param request.body.code 소스코드
 * @param request.body.language 언어 (javascript | python)
 * @param request.body.testCases 테스트 케이스 배열
 * @return 테스트 케이스별 통과/실패 결과
 */
export async function POST(request: Request) {
  if (!JUDGE0_API_URL || !JUDGE0_API_KEY) {
    return NextResponse.json(
      { error: "채점 서버 설정이 누락되었습니다." },
      { status: 500 },
    );
  }

  const body: IJudgeRequestBody = await request.json();
  const { code, language, testCases } = body;

  if (
    !code ||
    !language ||
    !Array.isArray(testCases) ||
    testCases.length === 0
  ) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const languageId = LANGUAGE_ID_MAP[language];

  if (!languageId) {
    return NextResponse.json(
      { error: "지원하지 않는 언어입니다." },
      { status: 400 },
    );
  }

  const results = await Promise.all(
    testCases.map((testCase) => {
      return executeTestCase({ code, languageId, testCase });
    }),
  );

  const totalPassed = results.filter((r) => {
    return r.passed;
  }).length;

  const response: IJudgeResponse = {
    results,
    totalPassed,
    totalCases: testCases.length,
  };

  return NextResponse.json({ data: response });
}
