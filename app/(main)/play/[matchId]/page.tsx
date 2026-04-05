"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { use } from "react";

import EditorPanel from "@/app/features/editor/components/EditorPanel";
import type {
  IJudgeResponse,
  IOpponentProgress,
} from "@/app/features/editor/types";
import { useMatchRealtime } from "@/app/features/match/hooks/useMatchRealtime";
import type {
  IPlayerReadyPayload,
  IProgressUpdatePayload,
  IOpponentSubmittedPayload,
  IMatchFinishedPayload,
} from "@/app/features/match/types";
import ProblemPanel from "@/app/features/problem/components/ProblemPanel";
import type { IProblem } from "@/app/features/problem/types";
import { createClient } from "@/app/shared/lib/supabase/client";

interface IPlayPageProps {
  params: Promise<{ matchId: string }>;
}

/**
 * 임시 userId를 생성하거나 localStorage에서 가져온다.
 * Step 3(Auth)에서 세션 기반으로 교체 예정
 * @return userId 문자열
 */
function getOrCreateUserId() {
  if (typeof window === "undefined") {
    return { userId: "" };
  }

  const STORAGE_KEY = "code-clash-temp-user-id";
  const existing = localStorage.getItem(STORAGE_KEY);

  if (existing) {
    return { userId: existing };
  }

  const newId = crypto.randomUUID();

  localStorage.setItem(STORAGE_KEY, newId);

  return { userId: newId };
}

export default function PlayPage({ params }: IPlayPageProps) {
  const { matchId } = use(params);
  const [problem, setProblem] = useState<IProblem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [judgeResult, setJudgeResult] = useState<IJudgeResponse | null>(null);

  const [userId] = useState(() => {
    return getOrCreateUserId().userId;
  });
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [opponentProgress, setOpponentProgress] =
    useState<IOpponentProgress | null>(null);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [matchResult, setMatchResult] = useState<IMatchFinishedPayload | null>(
    null,
  );

  const { client } = useMemo(() => {
    return createClient();
  }, []);

  const handlePlayerReady = useCallback(
    ({ payload }: { payload: IPlayerReadyPayload }) => {
      if (payload.userId !== userId) {
        setOpponentReady(true);
      }
    },
    [userId],
  );

  const handleProgressUpdate = useCallback(
    ({ payload }: { payload: IProgressUpdatePayload }) => {
      if (payload.userId !== userId) {
        setOpponentProgress({
          passedCount: payload.passedCount,
          totalCount: payload.totalCount,
        });
      }
    },
    [userId],
  );

  const handleOpponentSubmitted = useCallback(
    ({ payload }: { payload: IOpponentSubmittedPayload }) => {
      if (payload.userId !== userId) {
        setOpponentSubmitted(true);
      }
    },
    [userId],
  );

  const handleMatchFinished = useCallback(
    ({ payload }: { payload: IMatchFinishedPayload }) => {
      setMatchResult(payload);
    },
    [],
  );

  const { broadcast, isSubscribed } = useMatchRealtime({
    matchId,
    callbacks: {
      onPlayerReady: handlePlayerReady,
      onProgressUpdate: handleProgressUpdate,
      onOpponentSubmitted: handleOpponentSubmitted,
      onMatchFinished: handleMatchFinished,
    },
  });

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

  // 문제 로딩 완료 + 채널 구독 완료 후 PLAYER_READY 브로드캐스트
  useEffect(() => {
    if (!problem || !isSubscribed || isReady) {
      return;
    }

    setIsReady(true);

    broadcast({
      event: "PLAYER_READY",
      payload: { userId },
    });
  }, [problem, isSubscribed, isReady, userId, broadcast]);

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

      // 코드 실행 결과를 상대방에게 브로드캐스트
      broadcast({
        event: "PROGRESS_UPDATE",
        payload: {
          userId,
          passedCount: data.totalPassed,
          totalCount: data.totalCases,
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async ({
    code,
    language,
  }: {
    code: string;
    language: string;
  }) => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/match/${matchId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, language }),
      });

      if (!response.ok) {
        const error = await response.json();

        console.error(error);
        return;
      }

      // 상대방에게 제출 완료 알림
      broadcast({
        event: "OPPONENT_SUBMITTED",
        payload: { userId },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const gameStarted = isReady && opponentReady;
  const isMatchFinished = matchResult !== null;

  const resultMessage = (() => {
    if (!matchResult) {
      return { text: "", color: "" };
    }

    if (matchResult.winnerId === userId) {
      return { text: "승리!", color: "text-green-400" };
    }

    if (matchResult.winnerId === null) {
      return { text: "무승부", color: "text-yellow-400" };
    }

    return { text: "패배", color: "text-red-400" };
  })();

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r">
        <ProblemPanel problem={problem} isLoading={isLoading} />
      </div>

      <div className="h-screen w-1/2">
        {isMatchFinished && (
          <div className="flex flex-col items-center gap-2 border-b bg-gray-900/50 px-4 py-4">
            <span className={`text-2xl font-bold ${resultMessage.color}`}>
              {resultMessage.text}
            </span>
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">
                내 점수: {matchResult.scores[userId] ?? 0}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                상대 점수:{" "}
                {Object.entries(matchResult.scores)
                  .filter(([id]) => {
                    return id !== userId;
                  })
                  .map(([, s]) => {
                    return s;
                  })[0] ?? 0}
              </span>
            </div>
          </div>
        )}

        {!isMatchFinished && !gameStarted && problem && (
          <div className="bg-muted/50 flex items-center justify-center gap-3 border-b px-4 py-3 text-sm">
            <span className={isReady ? "text-green-400" : "text-yellow-400"}>
              {isReady ? "● 나: 준비 완료" : "○ 나: 준비 중..."}
            </span>
            <span className="text-muted-foreground">|</span>
            <span
              className={opponentReady ? "text-green-400" : "text-yellow-400"}
            >
              {opponentReady ? "● 상대: 준비 완료" : "○ 상대: 대기 중..."}
            </span>
          </div>
        )}

        {!isMatchFinished && opponentSubmitted && (
          <div className="flex items-center justify-center border-b bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
            상대방이 최종 제출을 완료했습니다!
          </div>
        )}

        <EditorPanel
          onRun={handleRun}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          judgeResult={judgeResult}
          opponentProgress={opponentProgress}
        />
      </div>
    </div>
  );
}
