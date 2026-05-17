import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IProfileStats } from "@/app/features/profile/types";

/**
 * Step 3 프로필 PR (#18): 누적 전적 fetch 래퍼.
 *
 * 왜 RPC인가?
 * matches/match_participants 의 SELECT RLS는 본인 참가/호스트 매치만 노출한다. 타인 프로필에 진입한
 * 사용자는 그 사람의 매치 row를 못 보므로 직접 집계하면 무조건 0이 된다. `get_profile_stats(uuid)`는
 * SECURITY DEFINER STABLE로 RLS를 우회해서 카운트만 돌려준다 (개별 row는 노출 안 함 → 정보 노출 최소).
 *
 * 실패 시 throw하지 않고 fallback을 돌려주는 이유:
 * 프로필 페이지는 전적이 없어도 헤더/bio/편집 UI는 보여야 한다. RPC 한 번 실패가 페이지 전체 500으로
 * 번지는 걸 막기 위해 console.error만 남기고 0 0 0 0을 반환한다.
 *
 * @param userId 조회 대상 user id (profiles.id)
 * @param client server Supabase client (호출자에서 createClient로 만든 인스턴스 재사용)
 * @return stats 누적 전적
 */
export async function getProfileStats({
  userId,
  client,
}: {
  userId: string;
  client: SupabaseClient;
}): Promise<{ stats: IProfileStats }> {
  const { data, error } = await client.rpc("get_profile_stats", {
    p_user_id: userId,
  });

  if (error) {
    console.error(error);

    return {
      stats: { wins: 0, losses: 0, draws: 0, totalFinished: 0 },
    };
  }

  // RPC가 RETURNS TABLE 이므로 PostgREST는 배열로 돌려준다. 빈 배열이면 fallback.
  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return {
      stats: { wins: 0, losses: 0, draws: 0, totalFinished: 0 },
    };
  }

  return {
    stats: {
      wins: Number(row.wins ?? 0),
      losses: Number(row.losses ?? 0),
      draws: Number(row.draws ?? 0),
      totalFinished: Number(row.total_finished ?? 0),
    },
  };
}
