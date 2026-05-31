import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { generateReview } from "@/app/features/review/utils/generateReview";
import { getAiReview } from "@/app/features/review/utils/getAiReview";
import type { IAiReview } from "@/app/features/review/types";
import { requireUser } from "@/app/shared/lib/auth/requireUser";
import { createServiceClient } from "@/app/shared/lib/supabase/service";

// supabase-js + @google/genai 의 node 의존성을 위해 nodejs 런타임 강제
export const runtime = "nodejs";

/**
 * 본인 제출 코드에 대한 AI 리뷰를 lazy 생성/조회한다.
 * - requireUser 401 가드 + 본인 submission 소유 검증
 * - 이미 리뷰가 있으면 캐싱 반환 (멱등)
 * - 없으면 Gemini 호출 → service-role 로 ai_reviews INSERT (ON CONFLICT DO NOTHING)
 * @param params.matchId 매치 ID
 * @return { data: IAiReview } 또는 에러 JSON
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;
  const userId = user.id;

  // 매치 finished 확인 + 문제 id
  const { data: match, error: matchError } = await client
    .from("matches")
    .select("id, status, problem_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: "대전 방을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (match.status !== "finished") {
    return NextResponse.json(
      { error: "종료된 대전이 아닙니다." },
      { status: 400 },
    );
  }

  if (!match.problem_id) {
    return NextResponse.json(
      { error: "배정된 문제가 없습니다." },
      { status: 400 },
    );
  }

  // 본인 submission (소유 검증 — 본인 row 만 조회)
  // maybeSingle 로 "조회 자체 실패(DB 에러)" 와 "제출 없음(0건)" 을 구분한다.
  const { data: mySubmission, error: mySubmissionError } = await client
    .from("submissions")
    .select("id, code, language, passed_cases, total_cases")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .maybeSingle();

  if (mySubmissionError) {
    console.error(mySubmissionError);

    return NextResponse.json(
      { error: "제출 이력 조회에 실패했습니다." },
      { status: 500 },
    );
  }

  if (!mySubmission) {
    return NextResponse.json(
      { error: "제출 이력이 없습니다." },
      { status: 404 },
    );
  }

  // 캐싱: 이미 리뷰가 있으면 반환
  const existing = await getAiReview({
    client,
    submissionId: mySubmission.id,
  });

  if (existing) {
    return NextResponse.json({ data: existing });
  }

  // 상대 submission (co-participant RLS 로 조회 — 결과 페이지와 동일 경로)
  const { data: opponentSubmission } = await client
    .from("submissions")
    .select("code, language")
    .eq("match_id", matchId)
    .neq("user_id", userId)
    .single();

  // 문제 지문
  const { data: problem } = await client
    .from("problems")
    .select("title, description")
    .eq("id", match.problem_id)
    .single();

  if (!problem) {
    return NextResponse.json(
      { error: "문제를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // Gemini 호출
  let review: IAiReview;

  try {
    review = await generateReview({
      problemTitle: problem.title,
      problemDescription: problem.description ?? "",
      myCode: mySubmission.code,
      myLanguage: mySubmission.language,
      myPassedCases: mySubmission.passed_cases ?? 0,
      myTotalCases: mySubmission.total_cases ?? 0,
      opponentCode: opponentSubmission?.code ?? "",
      opponentLanguage: opponentSubmission?.language ?? "",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI 리뷰 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  // service-role INSERT (ai_reviews write 정책 부재 → 서버 단독 경로)
  let serviceClient: SupabaseClient;

  try {
    serviceClient = createServiceClient().client;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "AI 리뷰 저장 설정이 누락되었습니다 (E_SERVICE)." },
      { status: 500 },
    );
  }

  // submission_id UNIQUE(기존재) + ignoreDuplicates 로 동시 요청 멱등
  const { error: insertError } = await serviceClient.from("ai_reviews").upsert(
    {
      submission_id: mySubmission.id,
      content: review.content,
      summary: review.summary,
    },
    { onConflict: "submission_id", ignoreDuplicates: true },
  );

  if (insertError) {
    console.error(insertError);

    return NextResponse.json(
      { error: "AI 리뷰 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  // 동시 요청으로 다른 쪽이 먼저 저장했을 수 있다 (ignoreDuplicates 로 이쪽 INSERT 는 no-op).
  // 저장된 행을 다시 읽어 1 submission = 1 review 일관성을 보장하고, 조회 실패 시 방금 생성한 review 로 폴백한다.
  const saved = await getAiReview({ client, submissionId: mySubmission.id });

  return NextResponse.json({ data: saved ?? review });
}
