import { notFound, redirect } from "next/navigation";

import { createClient } from "@/app/shared/lib/supabase/server";

import ResultView from "./_components/ResultView";
import { getResultData } from "./_utils/getResultData";
import { highlightCode } from "./_utils/highlightCode";

interface IResultPageProps {
  params: Promise<{ matchId: string }>;
}

/**
 * Step 4-A: 결과 페이지 (server component).
 *
 * 흐름:
 * 1. middleware가 `/result` prefix 비로그인 접근을 막으므로 일반 경로에선 user 보장.
 *    그래도 방어적으로 null 가드 → notFound() (정보 노출 최소화 원칙).
 * 2. matches status pre-check (가벼운 1 컬럼 select) — RLS 자연 게이트로 비참가자/매치 부재 0건 → notFound().
 * 3. status가 waiting/ongoing이면 /play/[matchId]로 redirect. unknown status는 notFound() fallback.
 * 4. status === "finished"가 확정된 후 getResultData로 풀 데이터 fetch + 정합성 검사 (0건/이상 시 notFound()).
 * 5. 양쪽 코드를 Shiki로 server-side highlight 후 ResultView로 전달.
 *
 * 왜 status pre-check를 분리했나:
 * getResultData는 submissions 2건 정합성을 검증하기 때문에 ongoing/waiting 진입 시
 * (submissions 0~1건이라 정상) null 반환 → notFound()로 잘못 처리될 위험이 있다.
 * status를 먼저 확인하면 /play redirect 흐름이 정확히 동작한다.
 *
 * @return 결과 페이지 JSX (또는 notFound / redirect)
 */
export default async function ResultPage({ params }: IResultPageProps) {
  const { matchId } = await params;
  const { client } = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    notFound();
  }

  // status pre-check (matches RLS 게이트 + 상태 분기)
  const statusRes = await client
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .single();

  if (statusRes.error || !statusRes.data) {
    notFound();
  }

  const status = statusRes.data.status as string;

  if (status === "waiting" || status === "ongoing") {
    redirect(`/play/${matchId}`);
  }

  if (status !== "finished") {
    notFound();
  }

  // finished 확정 — 풀 데이터 fetch
  const data = await getResultData({ client, matchId, userId: user.id });

  if (!data) {
    notFound();
  }

  const [hostHighlighted, guestHighlighted] = await Promise.all([
    highlightCode({
      code: data.host.submission.code,
      language: data.host.submission.language,
    }),
    highlightCode({
      code: data.guest.submission.code,
      language: data.guest.submission.language,
    }),
  ]);

  return (
    <ResultView
      data={data}
      hostHighlighted={hostHighlighted}
      guestHighlighted={guestHighlighted}
    />
  );
}
