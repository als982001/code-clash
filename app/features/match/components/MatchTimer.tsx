"use client";

import { formatMatchTime } from "@/app/features/match/utils/formatMatchTime";

interface IMatchTimerProps {
  remainingSeconds: number;
  isExpired: boolean;
  isWarning: boolean;
}

/**
 * 대전 남은 시간을 mm:ss 포맷으로 표시하는 상단 바.
 * 30초 이하 또는 만료 상태에서는 빨간색 pulse 애니메이션으로 경고한다.
 * @param params.remainingSeconds 남은 초
 * @param params.isExpired 만료 여부
 * @param params.isWarning 경고 구간 (≤30초) 여부
 */
export default function MatchTimer({
  remainingSeconds,
  isExpired,
  isWarning,
}: IMatchTimerProps) {
  const { formatted } = formatMatchTime({ seconds: remainingSeconds });
  const isAlert = isExpired || isWarning;

  return (
    <div className="flex items-center justify-center gap-3 border-b bg-gray-900/40 px-4 py-3 text-sm">
      <span className="text-muted-foreground">남은 시간</span>
      <span
        className={`font-mono text-lg font-bold tabular-nums ${
          isAlert ? "animate-pulse text-red-400" : "text-white"
        }`}
      >
        {formatted}
      </span>
    </div>
  );
}
