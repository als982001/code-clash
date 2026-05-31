export interface IResultParticipantSubmission {
  id: string;
  code: string;
  language: string;
  passedCases: number;
  totalCases: number;
  submittedAt: string;
}

export interface IResultParticipant {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  score: number;
  isMe: boolean;
  mmrChange: number | null;
  currentMmr: number;
  tier: string;
  submission: IResultParticipantSubmission;
}

export interface IResultMatch {
  id: string;
  status: "finished";
  winnerId: string | null;
  endTime: string;
  problemId: string;
  hostId: string;
}

export interface IResultData {
  match: IResultMatch;
  host: IResultParticipant;
  guest: IResultParticipant;
}

export interface IHighlightedCode {
  html: string;
  fallback: boolean;
}
