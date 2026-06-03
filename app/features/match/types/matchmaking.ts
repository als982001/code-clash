// 자동 매칭 큐 진입 API 결과.
// matched=true면 즉시 매칭 성사(상대를 큐에서 찾음) → matchId로 /play 이동.
// matched=false면 큐에 등록되어 대기 → Realtime으로 match_id 채워질 때까지 대기.
export type IMatchmakingJoinResult =
  | { matched: true; matchId: string }
  | { matched: false };

export interface IMatchmakingJoinResponse {
  data: IMatchmakingJoinResult;
}
