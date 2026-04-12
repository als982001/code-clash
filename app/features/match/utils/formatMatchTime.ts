/**
 * 남은 초를 mm:ss 문자열로 포맷한다.
 * @param params.seconds 남은 초 (음수는 0으로 간주)
 * @return mm:ss 형태의 문자열
 */
export function formatMatchTime({ seconds }: { seconds: number }): {
  formatted: string;
} {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const ss = (safe % 60).toString().padStart(2, "0");

  return { formatted: `${mm}:${ss}` };
}
