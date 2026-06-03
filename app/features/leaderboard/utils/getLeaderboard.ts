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
 * 익명(게스트) 유저 제외:
 * handle_new_user 트리거가 is_anonymous 가입에 'Anon_' prefix 닉네임을 보장하므로(정식 유저는 'Player_'
 * 또는 custom), 닉네임 패턴으로 거른다. profiles에 is_anonymous 컬럼이 없어 택한 방식 —
 * 트리거의 prefix 규칙과 결합되는 점에 유의하고, 향후 익명 플로우 본격화 시 is_anonymous 컬럼으로 승격 권장.
 * ('Anon_'의 '_'는 LIKE 와일드카드라 백슬래시로 escape하여 literal underscore로 매칭)
 *
 * 실패 시 throw하지 않고 빈 배열 fallback — 한 번의 조회 실패가 페이지 전체 500으로 번지는 걸 막는다
 * (getProfileStats와 동일 정책).
 *
 * @param client server Supabase client (호출자에서 createClient로 만든 인스턴스 재사용)
 * @param limit 최대 표시 행 수 (기본 100, 향후 페이지네이션 자리)
 * @return entries 순위 정렬된 리더보드 행 배열 (익명 유저 제외)
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
    .not("nickname", "like", "Anon\\_%")
    .order("mmr", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(error);

    return { entries: [] };
  }

  return { entries: (data ?? []) as ILeaderboardEntry[] };
}
