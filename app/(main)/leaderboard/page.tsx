import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/features/leaderboard/utils/getLeaderboard";
import { createClient } from "@/app/shared/lib/supabase/server";

import { LeaderboardView } from "./_components/LeaderboardView";

/**
 * 리더보드 PR (MVP A-1): 리더보드 페이지 (server component).
 *
 * 흐름:
 * 1. middleware가 `/leaderboard` 보호 prefix 비로그인 접근을 막으므로 user는 일반적으로 존재.
 *    그래도 방어적으로 null 가드 — 정보 노출 최소화 차원에서 notFound().
 * 2. getLeaderboard로 mmr 내림차순 순위 fetch (profiles RLS가 전체 read 허용).
 * 3. 본인 행 하이라이트를 위해 user.id를 currentUserId로 전달.
 *
 * 전적(승/패)은 이번 스코프에서 제외 — profiles.wins/losses는 미신뢰 컬럼이고 정확한 집계는
 * 전체 유저 대상 RPC가 필요하다 (Post-MVP 최우선 항목).
 */
export default async function LeaderboardPage() {
  const { client } = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    notFound();
  }

  const { entries } = await getLeaderboard({ client });

  return <LeaderboardView entries={entries} currentUserId={user.id} />;
}
