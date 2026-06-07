/** Elo K-factor — 한 매치당 최대 변동 폭을 결정 */
const K_FACTOR = 32;

/**
 * Elo 공식으로 양쪽 참가자의 MMR 변동량을 산출한다.
 * 기대 승률 E_a = 1 / (1 + 10^((R_b - R_a)/400)), 변동 = K × (S - E).
 * 승점 S: 승 1 / 패 0 / 무승부 0.5.
 * @param ratingA A 참가자의 현재 MMR
 * @param ratingB B 참가자의 현재 MMR
 * @param winnerId 승자 user_id (무승부면 null)
 * @param userIdA A 참가자 user_id
 * @param userIdB B 참가자 user_id
 * @return A/B 각각의 정수 변동량
 */
export function calculateMmr({
  ratingA,
  ratingB,
  winnerId,
  userIdA,
  userIdB,
}: {
  ratingA: number;
  ratingB: number;
  winnerId: string | null;
  userIdA: string;
  userIdB: string;
}): { changeA: number; changeB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const scoreA = winnerId === userIdA ? 1 : winnerId === userIdB ? 0 : 0.5;
  const scoreB = 1 - scoreA;

  const changeA = Math.round(K_FACTOR * (scoreA - expectedA));
  const changeB = Math.round(K_FACTOR * (scoreB - expectedB));

  return { changeA, changeB };
}
