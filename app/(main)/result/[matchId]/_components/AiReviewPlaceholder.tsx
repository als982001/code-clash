"use client";

/**
 * AI 코드 리뷰 자리 (Step 4-B 진입점).
 * 현재는 정적 안내 카드. Step 4-B에서 props로 matchId 받아
 * ai_reviews fetch + Gemini 호출 + 결과 표시로 확장 예정.
 */
export default function AiReviewPlaceholder() {
  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">AI 코드 리뷰</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        준비 중입니다. 다음 단계에서 양쪽 코드를 AI가 분석하고 학습 포인트를
        제안합니다.
      </p>
    </section>
  );
}
