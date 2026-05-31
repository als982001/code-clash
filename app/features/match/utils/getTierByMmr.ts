/**
 * MMR 값에 해당하는 tier 문자열을 반환한다.
 * 구간: Bronze(~1199) / Silver(1200~1399) / Gold(1400~1599) / Platinum(1600~1799) / Diamond(1800~).
 * @param mmr 현재 MMR
 * @return tier 명칭
 */
export function getTierByMmr({ mmr }: { mmr: number }): { tier: string } {
  if (mmr >= 1800) return { tier: "Diamond" };

  if (mmr >= 1600) return { tier: "Platinum" };

  if (mmr >= 1400) return { tier: "Gold" };

  if (mmr >= 1200) return { tier: "Silver" };

  return { tier: "Bronze" };
}
