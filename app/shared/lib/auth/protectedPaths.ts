/**
 * 미들웨어와 클라이언트(UserMenu 로그아웃 분기 등)에서 공유하는
 * 보호 라우트 prefix 목록.
 */
export const PROTECTED_PREFIXES = [
  "/play",
  "/result",
  "/dashboard",
  // /profile 전체를 가드 — /profile/me + /profile/[userId] 모두 SSR 단계에서 비로그인 차단.
  // (Step 3 PR #18: 타인 프로필도 로그인 후 진입 정책)
  "/profile",
  // 리더보드 — profiles RLS가 TO authenticated라 비로그인은 어차피 데이터를 못 읽는다.
  // 빈 화면 대신 /login으로 보내는 게 일관적 (MVP A-1)
  "/leaderboard",
] as const;

/**
 * pathname이 보호 라우트 prefix에 해당하는지 판정한다.
 * @param pathname 검사 대상 경로
 * @return isProtected 보호 prefix와 매칭되면 true
 */
export function isProtectedPath({ pathname }: { pathname: string }): {
  isProtected: boolean;
} {
  const isProtected = PROTECTED_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });

  return { isProtected };
}
