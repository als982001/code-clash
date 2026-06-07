"use client";

import ProblemExampleSection from "@/app/features/problem/components/ProblemExampleSection";
import ProblemMetaHeader from "@/app/features/problem/components/ProblemMetaHeader";
import ProblemSection from "@/app/features/problem/components/ProblemSection";
import type { IProblem } from "@/app/features/problem/types";

interface IProblemPanelProps {
  problem: IProblem | null;
  isLoading: boolean;
}

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
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-6">
      <ProblemMetaHeader problem={problem} />

      <ProblemSection emoji="📝" title="문제 설명" body={problem.description} />

      <ProblemSection
        emoji="📥"
        title="입력 형식"
        body={problem.input_format}
      />

      <ProblemSection
        emoji="📤"
        title="출력 형식"
        body={problem.output_format}
      />

      {problem.examples.map((example, index) => {
        return (
          <ProblemExampleSection
            key={index}
            example={example}
            index={index}
            total={problem.examples.length}
          />
        );
      })}
    </div>
  );
}
