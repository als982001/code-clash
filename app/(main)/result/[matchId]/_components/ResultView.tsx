"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";

import type { IAiReview } from "@/app/features/review/types";
import type {
  IResultData,
  IHighlightedCode,
} from "@/app/features/result/types";

import AiReviewSection from "./AiReviewSection";
import ParticipantCodeCard from "./ParticipantCodeCard";
import ResultHeader from "./ResultHeader";

interface IResultViewProps {
  data: IResultData;
  hostHighlighted: IHighlightedCode;
  guestHighlighted: IHighlightedCode;
  matchId: string;
  initialReview: IAiReview | null;
}

/**
 * 결과 페이지 메인 뷰 - 헤더 / 양쪽 코드 grid / AI 리뷰 섹션 / 홈 Link.
 * 모바일은 코드 상하 stack, md+ 좌우 grid.
 * isMe 기준으로 렌더링 순서만 swap (DB의 host/guest 의미는 그대로 유지).
 * @param data 결과 데이터
 * @param hostHighlighted host 코드 Shiki HTML
 * @param guestHighlighted guest 코드 Shiki HTML
 * @param matchId 매치 ID (AI 리뷰 생성 API 호출용)
 * @param initialReview SSR 캐싱 히트 시 전달되는 초기 AI 리뷰 (없으면 null)
 * @return 페이지 JSX
 */
export default function ResultView({
  data,
  hostHighlighted,
  guestHighlighted,
  matchId,
  initialReview,
}: IResultViewProps) {
  const isHostMe = data.host.isMe;
  const me = isHostMe ? data.host : data.guest;
  const opponent = isHostMe ? data.guest : data.host;
  const meHighlighted = isHostMe ? hostHighlighted : guestHighlighted;
  const opponentHighlighted = isHostMe ? guestHighlighted : hostHighlighted;

  return (
    <div className="flex min-h-screen flex-col">
      <ResultHeader data={data} />

      <section className="flex-1 px-4 py-6 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <ParticipantCodeCard participant={me} highlighted={meHighlighted} />
            <ParticipantCodeCard
              participant={opponent}
              highlighted={opponentHighlighted}
            />
          </div>

          <AiReviewSection matchId={matchId} initialReview={initialReview} />

          <div className="flex justify-center pt-2">
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
