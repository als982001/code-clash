"use client";

import type { IJudgeResponse } from "@/app/features/editor/types";

interface IResultPanelProps {
  result: IJudgeResponse | null;
  isRunning: boolean;
}

export default function ResultPanel({ result, isRunning }: IResultPanelProps) {
  if (isRunning) {
    return (
      <div className="flex items-center gap-2 p-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
        <span className="text-sm text-gray-400">채점 중...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">
          코드를 실행하면 결과가 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          테스트 결과: {result.totalPassed}/{result.totalCases} 통과
        </span>

        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            result.totalCases > 0 && result.totalPassed === result.totalCases
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {result.totalCases > 0 && result.totalPassed === result.totalCases
            ? "ALL PASS"
            : "FAIL"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {result.results.map((testCase, index) => {
          return (
            <div
              key={testCase.testCaseId}
              className={`rounded border p-3 ${
                testCase.passed
                  ? "border-green-800 bg-green-900/20"
                  : "border-red-800 bg-red-900/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {testCase.passed ? "✓" : "✗"} 테스트 {index + 1}
                </span>

                {testCase.time && (
                  <span className="text-xs text-gray-400">
                    {testCase.time}s
                    {testCase.memory
                      ? ` | ${Math.floor(testCase.memory)}KB`
                      : ""}
                  </span>
                )}
              </div>

              {testCase.error && (
                <pre className="mt-2 overflow-x-auto rounded bg-black/30 p-2 text-xs text-red-300">
                  {testCase.error}
                </pre>
              )}

              {!testCase.passed && !testCase.error && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-400">
                    입력:{" "}
                    <span className="text-gray-300">{testCase.input}</span>
                  </div>

                  <div className="text-gray-400">
                    기대값:{" "}
                    <span className="text-green-300">
                      {testCase.expectedOutput}
                    </span>
                  </div>

                  <div className="text-gray-400">
                    실제값:{" "}
                    <span className="text-red-300">
                      {testCase.actualOutput ?? "(출력 없음)"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
