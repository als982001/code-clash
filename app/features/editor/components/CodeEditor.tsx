"use client";

import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => {
    return (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <p className="text-gray-400">에디터 로딩 중...</p>
      </div>
    );
  },
});

interface ICodeEditorProps {
  language: string;
  value: string;
  onChange: ({ value }: { value: string }) => void;
}

export default function CodeEditor({
  language,
  value,
  onChange,
}: ICodeEditorProps) {
  const handleChange = (newValue: string | undefined) => {
    onChange({ value: newValue ?? "" });
  };

  return (
    <MonacoEditor
      height="100%"
      language={language}
      theme="vs-dark"
      value={value}
      onChange={handleChange}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 16 },
      }}
    />
  );
}
