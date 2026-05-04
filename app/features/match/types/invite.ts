export interface IInviteMatch {
  matchId: string;
  inviteToken: string;
  inviteUrl: string;
  inviteExpiresAt: string;
}

export interface IInviteResponse {
  data: IInviteMatch;
}

/**
 * /invite/[token] 페이지 진입 시 서버 사전 검증 실패 사유.
 * - not_found: invite_token 미존재
 * - expired: invite_expires_at < now()
 * - already_started: match.status === "ongoing"
 * - already_finished: match.status === "finished"
 * - full: match_participants count >= 2
 */
export type TInvitePageError =
  | "not_found"
  | "expired"
  | "already_started"
  | "already_finished"
  | "full";
