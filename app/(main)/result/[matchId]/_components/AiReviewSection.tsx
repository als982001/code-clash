"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import type { IAiReview } from "@/app/features/review/types";

interface IAiReviewSectionProps {
  matchId: string;
  initialReview: IAiReview | null;
}

/**
 * AI 코드 리뷰 섹션.
 * 초기 리뷰가 있으면 즉시 렌더, 없으면 마운트 후 생성 API 를 1회 호출한다.
 * 실패 시 "다시 시도" 버튼을 노출한다.
 * @param matchId 매치 ID
 * @param initialReview SSR 캐싱 히트 시 전달되는 초기 리뷰 (없으면 null)
 * @return 리뷰 섹션 JSX
 */
export default function AiReviewSection({
  matchId,
  initialReview,
}: IAiReviewSectionProps) {
  const [review, setReview] = useState<IAiReview | null>(initialReview);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestReview = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);

    try {
      const res = await fetch(`/api/match/${matchId}/review`, {
        method: "POST",
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        setIsError(true);

        return;
      }

      const json = await res.json();

      if (!isMountedRef.current) return;

      setReview(json.data as IAiReview);
    } catch (error) {
      console.error(error);

      if (!isMountedRef.current) return;

      setIsError(true);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (initialReview) return;

    // 마운트 후 외부 fetch 트리거 (동기 초기화가 아님 → lazy initializer 대체 불가).
    // requestReview 내부 setState 는 비동기 네트워크 흐름의 일부라 정당하다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    requestReview();
  }, [initialReview, requestReview]);

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">AI 코드 리뷰</h2>

      {isLoading && (
        <p className="mt-2 text-sm text-muted-foreground">
          AI가 코드를 분석하고 있습니다...
        </p>
      )}

      {isError && !isLoading && (
        <div className="mt-2 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            리뷰 생성에 실패했습니다.
          </p>
          <Button size="sm" variant="outline" onClick={requestReview}>
            다시 시도
          </Button>
        </div>
      )}

      {review && !isLoading && (
        <div className="mt-4 flex flex-col gap-4 text-sm">
          {review.summary && <p className="font-medium">{review.summary}</p>}

          <div>
            <h3 className="font-semibold">복잡도 (complexity)</h3>
            <p className="mt-1 text-muted-foreground">
              시간(time): {review.content.complexity.time} · 공간(space):{" "}
              {review.content.complexity.space}
            </p>
            <p className="mt-1 text-muted-foreground">
              {review.content.complexity.rationale}
            </p>
          </div>

          {review.content.strengths.length > 0 && (
            <div>
              <h3 className="font-semibold">강점</h3>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {review.content.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {review.content.improvements.length > 0 && (
            <div>
              <h3 className="font-semibold">개선 제안</h3>
              <ul className="mt-1 flex flex-col gap-2 text-muted-foreground">
                {review.content.improvements.map((imp, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">
                      {imp.title}
                    </span>
                    {" — "}
                    {imp.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.content.comparison && (
            <div>
              <h3 className="font-semibold">상대 코드 대비</h3>
              <p className="mt-1 text-muted-foreground">
                {review.content.comparison}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
