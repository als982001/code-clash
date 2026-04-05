"use client";

import { useState } from "react";

interface IEditorPanelProps {
  onRun: ({ code, language }: { code: string; language: string }) => void;
  onSubmit: ({ code, language }: { code: string; language: string }) => void;
  isRunning: boolean;
}

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
];

export default function EditorPanel({
  onRun,
  onSubmit,
  isRunning,
}: IEditorPanelProps) {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

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
            disabled={isRunning || !code.trim()}
            className="rounded bg-green-600 px-4 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {isRunning ? "실행 중..." : "코드 실행"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isRunning || !code.trim()}
            className="rounded bg-blue-600 px-4 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            최종 제출
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#1e1e1e]">
        {/* Monaco Editor 자리 — 1-2-2에서 통합 */}
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
          }}
          placeholder="// 코드를 작성하세요..."
          className="h-full w-full resize-none bg-[#1e1e1e] p-4 font-mono text-sm text-white outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
