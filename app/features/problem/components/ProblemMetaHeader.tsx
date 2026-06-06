import type { IProblem } from "@/app/features/problem/types";

interface IProblemMetaHeaderProps {
  problem: IProblem;
}

const difficultyColor: Record<string, string> = {
  "Level 1": "text-green-400",
  "Level 2": "text-yellow-400",
  "Level 3": "text-red-400",
};

export default function ProblemMetaHeader({
  problem,
}: IProblemMetaHeaderProps) {
  return (
    <div className="bg-card rounded-lg border p-4">
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
  );
}
