/**
 * tier 명칭에 해당하는 이모지를 반환한다.
 * @param tier tier 명칭 (Bronze/Silver/Gold/Platinum/Diamond)
 * @return 이모지 문자열 (미매칭 시 빈 문자열)
 */
export function getTierEmoji({ tier }: { tier: string }): { emoji: string } {
  const emojiByTier: Record<string, string> = {
    Bronze: "🥉",
    Silver: "🥈",
    Gold: "🥇",
    Platinum: "💠",
    Diamond: "💎",
  };

  return { emoji: emojiByTier[tier] ?? "" };
}
