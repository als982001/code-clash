/**
 * 리더보드 PR (MVP A-1) 전역 타입.
 * 모든 interface는 코드 컨벤션에 따라 대문자 "I" prefix 사용.
 */

/**
 * 리더보드 순위 한 줄. get_leaderboard RPC가 반환하는 컬럼과 1:1 매칭.
 * tier는 컬럼이 아니라 mmr에서 getTierByMmr로 파생하므로 포함하지 않는다.
 * (DB profiles.tier 컬럼은 nullable + 동기화 미보장이라 미신뢰)
 * wins/losses/draws/total_finished는 RPC가 finished 매치를 집계한 값으로 항상 숫자(NULL 아님).
 */
export interface ILeaderboardEntry {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  mmr: number | null;
  created_at: string | null;
  wins: number;
  losses: number;
  draws: number;
  total_finished: number;
}

/**
 * 순위(rank)가 부여된 리더보드 항목. rankEntries가 ILeaderboardEntry에 rank를 붙여 반환.
 * rank는 standard competition ranking(동점은 같은 순위, 다음은 인원수만큼 건너뜀).
 */
export interface IRankedEntry extends ILeaderboardEntry {
  rank: number;
}
