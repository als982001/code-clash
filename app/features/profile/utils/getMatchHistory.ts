import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IMatchHistoryEntry } from "@/app/features/profile/types";

/**
 * `get_match_history` RPC 가 돌려주는 raw row (snake_case). PostgREST 가 RETURNS TABLE 을
 * 배열로 반환하므로 이 타입으로 좁혀 컬럼명 오타를 컴파일 타임에 잡는다.
 */
interface IMatchHistoryRow {
  match_id: string;
  result: string;
  problem_title: string | null;
  opponent_id: string | null;
  opponent_nickname: string | null;
  opponent_avatar_url: string | null;
  my_mmr_change: number | null;
  end_time: string | null;
  created_at: string | null;
}

/**
 * Post-MVP A-5: 대전 히스토리 fetch 래퍼.
 *
 * 왜 RPC인가?
 * matches/match_participants 의 SELECT RLS 는 본인 참가/호스트 매치만 노출한다. 타인 프로필에
 * 진입한 사용자는 그 사람의 매치 row 를 못 보므로 직접 select 는 0건이 된다. `get_match_history`
 * 는 SECURITY DEFINER STABLE 로 RLS 를 우회해 그 유저 관점의 매치 리스트를 돌려준다.
 *
 * 실패 시 throw 하지 않고 빈 배열 fallback — RPC 한 번 실패가 프로필 페이지 전체 500 으로 번지는
 * 걸 막는다 (getProfileStats/getLeaderboard 와 동일 정책).
 *
 * @param userId 조회 대상 user id (profiles.id)
 * @param client server Supabase client (호출자에서 createClient 로 만든 인스턴스 재사용)
 * @param limit 최대 표시 행 수 (기본 20)
 * @return history 최근순 매치 히스토리 배열
 */
export async function getMatchHistory({
  userId,
  client,
  limit = 20,
}: {
  userId: string;
  client: SupabaseClient;
  limit?: number;
}): Promise<{ history: IMatchHistoryEntry[] }> {
  const { data, error } = await client.rpc("get_match_history", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error(error);

    return { history: [] };
  }

  const rows: IMatchHistoryRow[] = Array.isArray(data) ? data : [];

  const history = rows.map((row) => {
    return {
      matchId: row.match_id,
      result: row.result as IMatchHistoryEntry["result"],
      problemTitle: row.problem_title ?? null,
      opponentId: row.opponent_id ?? null,
      opponentNickname: row.opponent_nickname ?? null,
      opponentAvatarUrl: row.opponent_avatar_url ?? null,
      myMmrChange: row.my_mmr_change ?? null,
      endTime: row.end_time ?? null,
    };
  });

  return { history };
}
