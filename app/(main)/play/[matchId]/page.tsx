"use client";

import { useEffect, useMemo, useState } from "react";
import { use } from "react";

import EditorPanel from "@/app/features/editor/components/EditorPanel";
import type { IJudgeResponse } from "@/app/features/editor/types";
import ProblemPanel from "@/app/features/problem/components/ProblemPanel";
import type { IProblem } from "@/app/features/problem/types";
import { createClient } from "@/app/shared/lib/supabase/client";

interface IPlayPageProps {
  params: Promise<{ matchId: string }>;
}

export default function PlayPage({ params }: IPlayPageProps) {
  const { matchId } = use(params);
  const [problem, setProblem] = useState<IProblem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [judgeResult, setJudgeResult] = useState<IJudgeResponse | null>(null);
  const { client } = useMemo(() => {
    return createClient();
  }, []);

  useEffect(() => {
    const fetchProblem = async () => {
      const { data: match } = await client
        .from("matches")
        .select("problem_id")
        .eq("id", matchId)
        .single();

      if (!match?.problem_id) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/problems/${match.problem_id}`);

      if (!response.ok) {
        setIsLoading(false);
        return;
      }

      const { data } = await response.json();

      setProblem(data);
      setIsLoading(false);
    };

    fetchProblem();
  }, [matchId, client]);

  const handleRun = async ({
    code,
    language,
  }: {
    code: string;
    language: string;
  }) => {
    if (!problem?.testCases?.length) {
      return;
    }

    setIsRunning(true);
    setJudgeResult(null);

    try {
      const response = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          testCases: problem.testCases,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        console.error(error);
        return;
      }

      const { data } = await response.json();

      setJudgeResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = ({
    code,
    language,
  }: {
    code: string;
    language: string;
  }) => {
    setIsSubmitting(true);
    // 최종 제출은 1-3-5에서 구현
    console.log("최종 제출:", { code, language });
    setIsSubmitting(false);
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r">
        <ProblemPanel problem={problem} isLoading={isLoading} />
      </div>

      <div className="h-screen w-1/2">
        <EditorPanel
          onRun={handleRun}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          judgeResult={judgeResult}
        />
      </div>
    </div>
  );
}
