/**
 * invite_expires_at ISO 문자열을 현재 시각과 비교해 만료 여부를 반환한다.
 * 컴포넌트 본문에서 직접 Date.now()를 호출하면 React 19 React Compiler의
 * idempotency 룰에 걸리므로 외부 헬퍼로 분리한다.
 *
 * @param isoString invite_expires_at ISO 문자열 (null 허용)
 * @return expired 만료되었으면 true
 */
export function isInviteExpired({ isoString }: { isoString: string | null }): {
  expired: boolean;
} {
  if (!isoString) return { expired: false };

  return { expired: new Date(isoString).getTime() < Date.now() };
}
