import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ILeaderboardEntry } from "@/app/features/leaderboard/types";

/**
 * 리더보드 PR (MVP A-1): MMR 내림차순 순위 목록 fetch 래퍼.
 *
 * 왜 직접 select가 아니라 get_leaderboard RPC인가?
 * 전적(wins/losses/draws)은 본인뿐 아니라 전체 유저의 matches/match_participants 집계가 필요한데,
 * 두 테이블의 SELECT RLS가 본인 외 데이터를 차단해 직접 select로는 타인 전적이 0/0/0으로 잘못 보인다.
 * 따라서 SECURITY DEFINER STABLE인 get_leaderboard RPC로 RLS를 안전 우회한다.
 * 정렬(mmr DESC NULLS LAST → created_at ASC)과 익명(Anon_) 제외 로직도 RPC 내부로 이동했다.
 *
 * 실패 시 throw하지 않고 빈 배열 fallback — 한 번의 조회 실패가 페이지 전체 500으로 번지는 걸 막는다
 * (getProfileStats와 동일 정책).
 *
 * @param client server Supabase client (호출자에서 createClient로 만든 인스턴스 재사용)
 * @param limit 최대 표시 행 수 (기본 100, 향후 페이지네이션 자리)
 * @return entries 순위 정렬된 리더보드 행 배열 (익명 유저 제외, 전적 집계 포함)
 */
export async function getLeaderboard({
  client,
  limit = 100,
}: {
  client: SupabaseClient;
  limit?: number;
}): Promise<{ entries: ILeaderboardEntry[] }> {
  const { data, error } = await client.rpc("get_leaderboard", {
    p_limit: limit,
  });

  if (error) {
    console.error(error);

    return { entries: [] };
  }

  return { entries: (data ?? []) as ILeaderboardEntry[] };
}
