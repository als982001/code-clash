import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IAiReview } from "@/app/features/review/types";

import { isValidReviewContent } from "./isValidReviewContent";

interface IGetAiReviewParams {
  client: SupabaseClient;
  submissionId: string;
}

/**
 * 주어진 submission의 ai_reviews 1행을 조회한다.
 * RLS self_read 정책상 본인 submission의 리뷰만 보인다.
 * @param client supabase client (authenticated)
 * @param submissionId 본인 submission id
 * @return 리뷰가 있으면 IAiReview, 없으면 null
 */
export async function getAiReview({
  client,
  submissionId,
}: IGetAiReviewParams): Promise<IAiReview | null> {
  const { data, error } = await client
    .from("ai_reviews")
    .select("content, summary")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (error) {
    console.error(error);

    return null;
  }

  if (!data) {
    return null;
  }

  // 캐시된 content 가 malformed(이번 fix 이전에 저장된 깨진 LLM 출력 등)면
  // null 을 반환해 호출부가 재생성/재시도로 degrade 하도록 한다 (영구 크래시 방지).
  if (!isValidReviewContent(data.content)) {
    return null;
  }

  return {
    content: data.content,
    summary: (data.summary as string | null) ?? "",
  };
}
