import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface IProblemSectionProps {
  emoji: string;
  title: string;
  body: string;
}

export default function ProblemSection({
  emoji,
  title,
  body,
}: IProblemSectionProps) {
  return (
    <section className="bg-card rounded-lg border p-4">
      <h2 className="text-sm font-semibold">
        {emoji} {title}
      </h2>

      <div className="prose prose-invert prose-sm mt-2 max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </section>
  );
}
