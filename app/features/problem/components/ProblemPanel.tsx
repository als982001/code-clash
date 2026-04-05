"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { IProblem } from "@/app/features/problem/types";

interface IProblemPanelProps {
  problem: IProblem | null;
  isLoading: boolean;
}

const difficultyColor: Record<string, string> = {
  "Level 1": "text-green-400",
  "Level 2": "text-yellow-400",
  "Level 3": "text-red-400",
};

export default function ProblemPanel({
  problem,
  isLoading,
}: IProblemPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">문제를 불러오는 중...</p>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">문제를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{problem.title}</h1>

        <div className="mt-2 flex items-center gap-3">
          <span
            className={`text-sm font-medium ${difficultyColor[problem.difficulty] ?? "text-gray-400"}`}
          >
            {problem.difficulty}
          </span>

          <span className="text-muted-foreground text-xs">
            시간 제한: {problem.time_limit}ms | 메모리 제한:{" "}
            {Math.floor(problem.memory_limit / 1000)}MB
          </span>
        </div>

        <div className="mt-2 flex gap-2">
          {problem.tags.map((tag) => {
            return (
              <span key={tag} className="bg-muted rounded px-2 py-0.5 text-xs">
                {tag}
              </span>
            );
          })}
        </div>
      </div>

      <div className="prose prose-invert max-w-none flex-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {problem.description}
        </ReactMarkdown>
      </div>
    </div>
  );
}
