"use client";

import { useEffect, useRef, useState } from "react";

interface IUseMatchTimerProps {
  startTime: string | null;
  durationSeconds: number;
  enabled: boolean;
  onExpire: () => void;
}

interface IUseMatchTimerResult {
  remainingSeconds: number;
  isExpired: boolean;
  isWarning: boolean;
}

/**
 * 대전 시작 시각을 기준으로 남은 시간을 매초 계산하는 훅.
 * 백그라운드 탭에서도 정확한 시간을 유지하기 위해 Date.now() 차이로 계산한다.
 * @param params.startTime matches.start_time ISO 문자열 (null이면 타이머 미동작)
 * @param params.durationSeconds 총 제한 시간 (초)
 * @param params.enabled 타이머 동작 여부
 * @param params.onExpire 0초 도달 시 1회 호출되는 콜백
 * @return remainingSeconds/isExpired/isWarning 상태
 */
export function useMatchTimer({
  startTime,
  durationSeconds,
  enabled,
  onExpire,
}: IUseMatchTimerProps): IUseMatchTimerResult {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!enabled || !startTime) {
      return;
    }

    expiredRef.current = false;

    const computeRemaining = () => {
      const started = new Date(startTime).getTime();
      const elapsed = (Date.now() - started) / 1000;
      const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed));

      setRemainingSeconds(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current();
      }
    };

    computeRemaining();

    const intervalId = setInterval(computeRemaining, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, startTime, durationSeconds]);

  const isExpired = remainingSeconds <= 0;
  const isWarning = remainingSeconds <= 30;

  return { remainingSeconds, isExpired, isWarning };
}
