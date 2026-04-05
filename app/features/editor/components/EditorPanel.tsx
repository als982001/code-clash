"use client";

import { useCallback, useState } from "react";

import CodeEditor from "@/app/features/editor/components/CodeEditor";

interface IEditorPanelProps {
  onRun: ({ code, language }: { code: string; language: string }) => void;
  onSubmit: ({ code, language }: { code: string; language: string }) => void;
  isRunning: boolean;
  isSubmitting: boolean;
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
}: IEditorPanelProps) {
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({
    javascript: "",
    python: "",
  });
  const [language, setLanguage] = useState("javascript");

  const code = codeByLanguage[language] ?? "";

  const handleCodeChange = useCallback(
    ({ value }: { value: string }) => {
      setCodeByLanguage((prev) => {
        return { ...prev, [language]: value };
      });
    },
    [language],
  );

  const handleRun = () => {
    onRun({ code, language });
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
            setLanguage(e.target.value);
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
            disabled={isRunning || isSubmitting || !code.trim()}
            className="rounded bg-green-600 px-4 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning ? "실행 중..." : "코드 실행"}
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

      <div className="flex-1">
        <CodeEditor
          language={language}
          value={code}
          onChange={handleCodeChange}
        />
      </div>
    </div>
  );
}
