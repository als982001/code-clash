/**
 * 미들웨어와 클라이언트(UserMenu 로그아웃 분기 등)에서 공유하는
 * 보호 라우트 prefix 목록.
 */
export const PROTECTED_PREFIXES = [
  "/play",
  "/result",
  "/dashboard",
  "/profile/me",
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
