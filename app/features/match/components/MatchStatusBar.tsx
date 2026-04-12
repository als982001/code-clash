"use client";

import type { IOpponentProgress } from "@/app/features/editor/types";
import SoundToggle from "@/app/features/match/components/SoundToggle";
import { formatMatchTime } from "@/app/features/match/utils/formatMatchTime";

interface IMatchStatusBarProps {
  remainingSeconds: number;
  isExpired: boolean;
  isWarning: boolean;
  hasStartTime: boolean;
  myProgress: IOpponentProgress | null;
  opponentProgress: IOpponentProgress | null;
}

const getPercent = ({
  progress,
}: {
  progress: IOpponentProgress | null;
}): { percent: number } => {
  if (!progress || progress.totalCount <= 0) {
    return { percent: 0 };
  }

  return { percent: (progress.passedCount / progress.totalCount) * 100 };
};

const getCountText = ({
  progress,
}: {
  progress: IOpponentProgress | null;
}): { text: string } => {
  if (!progress) {
    return { text: "0/0" };
  }

  return { text: `${progress.passedCount}/${progress.totalCount}` };
};

/**
 * 대전 상단 HUD: 남은 시간, 내/상대 실시간 진행률을 한 줄에 표시한다.
 * @param params.remainingSeconds 타이머 남은 초
 * @param params.isExpired 타이머 만료 여부
 * @param params.isWarning 타이머 경고 구간(≤30초) 여부
 * @param params.hasStartTime matches.start_time 존재 여부 (false면 타이머를 --:--로 표시)
 * @param params.myProgress 내 실행 결과 진행률 (null이면 0/0)
 * @param params.opponentProgress 상대 브로드캐스트 진행률 (null이면 0/0)
 */
export default function MatchStatusBar({
  remainingSeconds,
  isExpired,
  isWarning,
  hasStartTime,
  myProgress,
  opponentProgress,
}: IMatchStatusBarProps) {
  const { formatted } = formatMatchTime({ seconds: remainingSeconds });
  const isAlert = hasStartTime && (isExpired || isWarning);

  const { percent: myPercent } = getPercent({ progress: myProgress });
  const { percent: opponentPercent } = getPercent({
    progress: opponentProgress,
  });

  const { text: myCountText } = getCountText({ progress: myProgress });
  const { text: opponentCountText } = getCountText({
    progress: opponentProgress,
  });

  return (
    <div className="flex items-center gap-4 border-b bg-gray-900/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">남은 시간</span>
        <span
          className={`font-mono text-lg font-bold tabular-nums ${
            isAlert ? "animate-pulse text-red-400" : "text-white"
          }`}
        >
          {hasStartTime ? formatted : "--:--"}
        </span>
      </div>

      <div className="bg-border h-6 w-px" />

      <div className="flex flex-1 items-center gap-4">
        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium text-green-400">나</span>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${myPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {myCountText}
          </span>
        </div>

        <span className="text-muted-foreground text-xs">vs</span>

        <div className="flex flex-1 items-center gap-2">
          <span className="font-medium text-red-400">상대</span>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-500"
              style={{ width: `${opponentPercent}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs tabular-nums">
            {opponentCountText}
          </span>
        </div>
      </div>

      <div className="bg-border h-6 w-px" />
      <SoundToggle />
    </div>
  );
}
