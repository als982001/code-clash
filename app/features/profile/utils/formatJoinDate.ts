/**
 * Step 3 프로필 PR (#18): 가입일 라벨 포맷터.
 * React 19 Compiler는 컴포넌트 본문 안에서 `new Date()` 같은 impure 호출을 금지한다
 * (idempotency 규칙). 그래서 포맷 로직은 반드시 외부 헬퍼로 분리한다 — 그러면 컴포넌트는
 * `formatJoinDate({ isoString })`만 호출하면 되고 Compiler 검사를 통과한다.
 *
 * 잘못된 ISO 문자열/`null`이 들어와도 빈 라벨을 돌려주도록 방어한다.
 */

const FORMATTER = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * ISO 문자열을 "2026년 5월 17일" 형식으로 포맷한다.
 * @param isoString profiles.created_at 등 ISO 8601 문자열 (null 허용)
 * @return label 포맷된 한국어 날짜 문자열 (실패 시 빈 문자열)
 */
export function formatJoinDate({ isoString }: { isoString: string | null }): {
  label: string;
} {
  if (!isoString) {
    return { label: "" };
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return { label: "" };
  }

  return { label: FORMATTER.format(date) };
}
