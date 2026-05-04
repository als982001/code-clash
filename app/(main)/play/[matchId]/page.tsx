"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { use } from "react";

import { toast } from "sonner";

import EditorPanel from "@/app/features/editor/components/EditorPanel";
import type {
  IJudgeResponse,
  IOpponentProgress,
} from "@/app/features/editor/types";
import MatchStatusBar from "@/app/features/match/components/MatchStatusBar";
import SoundToggle from "@/app/features/match/components/SoundToggle";
import { useMatchRealtime } from "@/app/features/match/hooks/useMatchRealtime";
import { useMatchSounds } from "@/app/features/match/hooks/useMatchSounds";
import { useMatchTimer } from "@/app/features/match/hooks/useMatchTimer";
import type {
  IPlayerReadyPayload,
  IProgressUpdatePayload,
  IOpponentSubmittedPayload,
  IMatchFinishedPayload,
} from "@/app/features/match/types";
import ProblemPanel from "@/app/features/problem/components/ProblemPanel";
import type { IProblem } from "@/app/features/problem/types";
import { useAuth } from "@/app/shared/hooks/useAuth";
import { createClient } from "@/app/shared/lib/supabase/client";

/** 대전 제한 시간 (초) - 15분 */
const MATCH_DURATION_SECONDS = 900;

interface IPlayPageProps {
  params: Promise<{ matchId: string }>;
}

export default function PlayPage({ params }: IPlayPageProps) {
  const { matchId } = use(params);
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;

  const [problem, setProblem] = useState<IProblem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [judgeResult, setJudgeResult] = useState<IJudgeResponse | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [myProgress, setMyProgress] = useState<IOpponentProgress | null>(null);
  const [opponentProgress, setOpponentProgress] =
    useState<IOpponentProgress | null>(null);
  const [matchResult, setMatchResult] = useState<IMatchFinishedPayload | null>(
    null,
  );
  const [startTime, setStartTime] = useState<string | null>(null);

  const hasAutoSubmittedRef = useRef(false);
  const hasPlayedWarningRef = useRef(false);
  const hasPlayedResultRef = useRef(false);
  const codeRef = useRef<{ code: string; language: string }>({
    code: "",
    language: "javascript",
  });

  const { client } = useMemo(() => {
    return createClient();
  }, []);

  const { playSound } = useMatchSounds();

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
        toast.warning("상대방이 최종 제출을 완료했습니다!", {
          duration: 5000,
        });

        playSound({ type: "opponentSubmit" });
      }
    },
    [userId, playSound],
  );

  const handleMatchFinished = useCallback(
    ({ payload }: { payload: IMatchFinishedPayload }) => {
      if (hasPlayedResultRef.current) {
        return;
      }

      hasPlayedResultRef.current = true;
      setMatchResult(payload);

      if (payload.winnerId === null) {
        playSound({ type: "draw" });
        return;
      }

      if (payload.winnerId === userId) {
        playSound({ type: "win" });
        return;
      }

      playSound({ type: "lose" });
    },
    [userId, playSound],
  );

  const handleCodeChange = useCallback(
    ({ code, language }: { code: string; language: string }) => {
      codeRef.current = { code, language };
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
        .select("problem_id, start_time")
        .eq("id", matchId)
        .single();

      if (!match?.problem_id) {
        setIsLoading(false);
        return;
      }

      setStartTime(match.start_time ?? null);

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

      setMyProgress({
        passedCount: data.totalPassed,
        totalCount: data.totalCases,
      });

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

  const handleSubmit = useCallback(
    async ({ code, language }: { code: string; language: string }) => {
      setIsSubmitting(true);
      playSound({ type: "submit" });

      try {
        const response = await fetch(`/api/match/${matchId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language }),
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
    },
    [matchId, userId, broadcast, playSound],
  );

  const gameStarted = isReady && opponentReady;
  const isMatchFinished = matchResult !== null;

  const handleTimerExpire = useCallback(() => {
    if (hasAutoSubmittedRef.current) {
      return;
    }

    if (isMatchFinished) {
      return;
    }

    hasAutoSubmittedRef.current = true;

    const { code, language } = codeRef.current;
    const fallbackCode = code.trim().length > 0 ? code : "// time out";

    handleSubmit({ code: fallbackCode, language });
  }, [handleSubmit, isMatchFinished]);

  const { remainingSeconds, isExpired, isWarning } = useMatchTimer({
    startTime,
    durationSeconds: MATCH_DURATION_SECONDS,
    enabled: gameStarted && !isMatchFinished,
    onExpire: handleTimerExpire,
  });

  // 주의: 새로고침 후 이미 경고 구간이어도 1회 재생되는 것이 정상 동작
  // (사용자가 경고를 놓치지 않도록 의도적으로 허용)
  useEffect(() => {
    if (!gameStarted || isMatchFinished) {
      return;
    }

    if (!isWarning) {
      return;
    }

    if (hasPlayedWarningRef.current) {
      return;
    }

    hasPlayedWarningRef.current = true;
    playSound({ type: "warning" });
  }, [gameStarted, isMatchFinished, isWarning, playSound]);

  const resultMessage = useMemo(() => {
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
  }, [matchResult, userId]);

  if (isAuthLoading || !userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-muted-foreground">인증 중...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/2 border-r">
        <ProblemPanel problem={problem} isLoading={isLoading} />
      </div>

      <div className="h-screen w-1/2">
        {isMatchFinished && (
          <div className="relative flex flex-col items-center gap-2 border-b bg-gray-900/50 px-4 py-4">
            <div className="absolute right-4 top-4">
              <SoundToggle />
            </div>
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
                {Object.entries(matchResult.scores).find(([id]) => {
                  return id !== userId;
                })?.[1] ?? 0}
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

        {gameStarted && !isMatchFinished && (
          <MatchStatusBar
            remainingSeconds={remainingSeconds}
            isExpired={isExpired}
            isWarning={isWarning}
            hasStartTime={startTime !== null}
            myProgress={myProgress}
            opponentProgress={opponentProgress}
          />
        )}

        <EditorPanel
          onRun={handleRun}
          onSubmit={handleSubmit}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          judgeResult={judgeResult}
          onCodeChange={handleCodeChange}
        />
      </div>
    </div>
  );
}
