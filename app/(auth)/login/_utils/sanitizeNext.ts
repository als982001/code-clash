/**
 * `next` 쿼리 파라미터를 same-origin 화이트리스트로 검증한다.
 * 절대 URL/프로토콜 시작/`//` 시작은 모두 거부해 open redirect 공격을 차단한다.
 * @param raw 검증 대상 raw 문자열 (null 허용)
 * @return safeNext 안전하게 redirect 가능한 경로 (`/`로 시작 + `//` 미시작), 그 외엔 "/"
 */
export function sanitizeNext({ raw }: { raw: string | null }): {
  safeNext: string;
} {
  const safeNext =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  return { safeNext };
}
