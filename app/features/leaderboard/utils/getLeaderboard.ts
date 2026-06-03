import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ILeaderboardEntry } from "@/app/features/leaderboard/types";

/**
 * 리더보드 PR (MVP A-1): MMR 내림차순 순위 목록 fetch 래퍼.
 *
 * 왜 RPC가 아니라 직접 select인가?
 * profiles의 SELECT RLS는 `TO authenticated USING (true)`라 인증 유저는 전체 row를 읽을 수 있다.
 * 따라서 별도 RPC 없이 직접 select + order로 충분하다. (전적까지 표시하려면 전체 유저 집계 RPC가
 * 필요한데, 그건 Post-MVP 최우선 항목으로 분리)
 *
 * 정렬: mmr DESC → created_at ASC (동률 시 먼저 가입한 유저 우선. nickname은 편집 가능해 정렬키 부적합).
 * mmr NULL row는 맨 뒤로 (nullsFirst: false).
 *
 * 실패 시 throw하지 않고 빈 배열 fallback — 한 번의 조회 실패가 페이지 전체 500으로 번지는 걸 막는다
 * (getProfileStats와 동일 정책).
 *
 * @param client server Supabase client (호출자에서 createClient로 만든 인스턴스 재사용)
 * @param limit 최대 표시 행 수 (기본 100, 향후 페이지네이션 자리)
 * @return entries 순위 정렬된 리더보드 행 배열
 */
export async function getLeaderboard({
  client,
  limit = 100,
}: {
  client: SupabaseClient;
  limit?: number;
}): Promise<{ entries: ILeaderboardEntry[] }> {
  const { data, error } = await client
    .from("profiles")
    .select("id, nickname, avatar_url, mmr, created_at")
    .order("mmr", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(error);

    return { entries: [] };
  }

  return { entries: (data ?? []) as ILeaderboardEntry[] };
}
