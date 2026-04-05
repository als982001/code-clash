export interface IMatch {
  id: string;
  status: "waiting" | "ongoing" | "finished";
  winner_id: string | null;
  problem_id: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

export interface IMatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  score: number | null;
  mmr_change: number | null;
  is_disconnected: boolean;
}

export interface IPlayerReadyPayload {
  userId: string;
}

export interface IProgressUpdatePayload {
  userId: string;
  passedCount: number;
  totalCount: number;
}

export interface IOpponentSubmittedPayload {
  userId: string;
}

export interface IMatchFinishedPayload {
  winnerId: string | null;
  scores: Record<string, number>;
  mmrChange: Record<string, number>;
}

export type TMatchEvent =
  | "PLAYER_READY"
  | "PROGRESS_UPDATE"
  | "OPPONENT_SUBMITTED"
  | "MATCH_FINISHED";
