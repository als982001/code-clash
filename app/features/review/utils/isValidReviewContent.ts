import type { IAiReviewContent } from "@/app/features/review/types";

/**
 * unknown 값이 IAiReviewContent shape 인지 런타임 검증한다 (타입 가드).
 * Gemini 구조화 출력(responseSchema)도 100% 보장이 아니고, DB 의 jsonb 컬럼도
 * 과거 malformed 데이터를 담고 있을 수 있으므로, INSERT/렌더 직전에 이 가드로 거른다.
 * @param value 검증 대상 (JSON.parse 결과 / DB jsonb 등)
 * @return value 가 IAiReviewContent 면 true (타입 좁힘)
 */
export function isValidReviewContent(
  value: unknown,
): value is IAiReviewContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const complexity = candidate.complexity as Record<string, unknown> | null;

  const isComplexityValid =
    !!complexity &&
    typeof complexity === "object" &&
    typeof complexity.time === "string" &&
    typeof complexity.space === "string" &&
    typeof complexity.rationale === "string";

  const isStrengthsValid =
    Array.isArray(candidate.strengths) &&
    candidate.strengths.every((item) => {
      return typeof item === "string";
    });

  const isImprovementsValid =
    Array.isArray(candidate.improvements) &&
    candidate.improvements.every((item) => {
      return (
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).detail === "string"
      );
    });

  const isComparisonValid = typeof candidate.comparison === "string";

  return (
    isComplexityValid &&
    isStrengthsValid &&
    isImprovementsValid &&
    isComparisonValid
  );
}
