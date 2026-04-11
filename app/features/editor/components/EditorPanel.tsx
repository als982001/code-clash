"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import CodeEditor from "@/app/features/editor/components/CodeEditor";
import ResultPanel from "@/app/features/editor/components/ResultPanel";
import type {
  IJudgeResponse,
  IOpponentProgress,
} from "@/app/features/editor/types";

interface IEditorPanelProps {
  onRun: ({ code, language }: { code: string; language: string }) => void;
  onSubmit: ({ code, language }: { code: string; language: string }) => void;
  isRunning: boolean;
  isSubmitting: boolean;
  judgeResult: IJudgeResponse | null;
  opponentProgress: IOpponentProgress | null;
  onCodeChange?: ({
    code,
    language,
  }: {
    code: string;
    language: string;
  }) => void;
}

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
];

export default function EditorPanel({
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  judgeResult,
  opponentProgress,
  onCodeChange,
}: IEditorPanelProps) {
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({
    javascript: "",
    python: "",
  });
  const [language, setLanguage] = useState("javascript");

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const code = codeByLanguage[language] ?? "";
  const isOnCooldown = cooldown > 0;

  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
    }

    setCooldown(3);

    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  const handleCodeChange = useCallback(
    ({ value }: { value: string }) => {
      setCodeByLanguage((prev) => {
        return { ...prev, [language]: value };
      });
      onCodeChange?.({ code: value, language });
    },
    [language, onCodeChange],
  );

  const handleRun = () => {
    onRun({ code, language });
    startCooldown();
  };

  const handleSubmit = () => {
    onSubmit({ code, language });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <select
          value={language}
          onChange={(e) => {
            const next = e.target.value;
            setLanguage(next);
            onCodeChange?.({
              code: codeByLanguage[next] ?? "",
              language: next,
            });
          }}
          className="bg-muted rounded px-3 py-1 text-sm"
        >
          {LANGUAGES.map((lang) => {
            return (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            );
          })}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleRun}
            disabled={isRunning || isSubmitting || isOnCooldown || !code.trim()}
            className="rounded bg-green-600 px-4 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning
              ? "실행 중..."
              : isOnCooldown
                ? `대기 (${cooldown}s)`
                : "코드 실행"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isRunning || isSubmitting || !code.trim()}
            className="rounded bg-blue-600 px-4 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "제출 중..." : "최종 제출"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <CodeEditor
          language={language}
          value={code}
          onChange={handleCodeChange}
        />
      </div>

      {opponentProgress && (
        <div className="flex items-center gap-3 border-t px-4 py-2 text-sm">
          <span className="text-muted-foreground">상대 진행률:</span>
          <div className="bg-muted h-2 flex-1 rounded-full">
            <div
              className="h-2 rounded-full bg-red-500 transition-all"
              style={{
                width: `${opponentProgress.totalCount > 0 ? (opponentProgress.passedCount / opponentProgress.totalCount) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-muted-foreground">
            {opponentProgress.passedCount}/{opponentProgress.totalCount}
          </span>
        </div>
      )}

      <div className="max-h-[40%] overflow-y-auto border-t">
        <ResultPanel result={judgeResult} isRunning={isRunning} />
      </div>
    </div>
  );
}
