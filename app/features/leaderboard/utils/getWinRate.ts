/**
 * finished 매치 누적 전적에서 승률(%)을 계산한다.
 * 승률 = wins / totalFinished (무승부 포함 분모 — 무승부도 '이기지 못한 경기'이므로
 * 분모에서 제외하면 승률이 실제보다 부풀려진다). 전적이 없으면(totalFinished 0) null 반환.
 * @param wins 승리 횟수
 * @param totalFinished finished 매치 총 횟수 (승률 분모)
 * @return winRate 0~100 정수 백분율, 전적이 없으면 null
 */
export function getWinRate({
  wins,
  totalFinished,
}: {
  wins: number;
  totalFinished: number;
}): { winRate: number | null } {
  if (totalFinished <= 0) {
    return { winRate: null };
  }

  return { winRate: Math.round((wins / totalFinished) * 100) };
}
