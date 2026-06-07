import { sanitizeNext } from "@/app/(auth)/login/_utils/sanitizeNext";

/**
 * OAuth provider에 전달할 redirectTo URL을 생성한다.
 * 클라이언트 컴포넌트에서만 호출되므로 SSR 환경에서는 빈 문자열을 반환한다.
 * `next` 인자는 sanitizeNext로 1차 검증해 same-origin 경로만 callback에 실어 보낸다.
 * @param next 로그인 성공 후 이동할 경로 (없으면 null)
 * @return { redirectTo } `${origin}/auth/callback` 또는 `${origin}/auth/callback?next=...` 형태의 절대 URL
 */
export function buildOAuthRedirect({ next }: { next: string | null }): {
  redirectTo: string;
} {
  if (typeof window === "undefined") {
    return { redirectTo: "" };
  }

  const { safeNext } = sanitizeNext({ raw: next });
  const base = `${window.location.origin}/auth/callback`;
  const redirectTo =
    safeNext === "/" ? base : `${base}?next=${encodeURIComponent(safeNext)}`;

  return { redirectTo };
}
