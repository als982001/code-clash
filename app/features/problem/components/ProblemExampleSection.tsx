import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { IProblemExample } from "@/app/features/problem/types";

interface IProblemExampleSectionProps {
  example: IProblemExample;
  index?: number;
  total?: number;
}

export default function ProblemExampleSection({
  example,
  index = 0,
  total = 1,
}: IProblemExampleSectionProps) {
  const heading = total > 1 ? `📋 예시 ${index + 1}` : "📋 예시";

  return (
    <section className="bg-card rounded-lg border p-4">
      <h2 className="text-sm font-semibold">{heading}</h2>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">입력</p>

          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs whitespace-pre">
            <code>{example.input}</code>
          </pre>
        </div>

        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium">출력</p>

          <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-xs whitespace-pre">
            <code>{example.output}</code>
          </pre>
        </div>
      </div>

      {example.explanation && (
        <div className="mt-3">
          <p className="text-muted-foreground mb-1 text-xs font-medium">설명</p>

          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {example.explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  );
}
