/**
 * Step 3 프로필 PR (#18) 전역 타입.
 * 모든 interface는 코드 컨벤션에 따라 대문자 "I" prefix 사용.
 */

/**
 * profiles 테이블 row 형태.
 * Supabase가 자동 생성하는 row 타입과 별도로, 프론트에서 알아야 할 필드만 명시.
 * `updated_at` 등 트리거에서 자동 갱신되는 컬럼은 표시용이 아니므로 제외.
 */
export interface IProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  mmr: number | null;
}

/**
 * `get_profile_stats(uuid)` RPC 결과.
 * camelCase로 매핑해서 컴포넌트에 전달.
 */
export interface IProfileStats {
  wins: number;
  losses: number;
  draws: number;
  totalFinished: number;
}

/**
 * 프로필 페이지가 자식 컴포넌트에 한 번에 전달하는 합성 props.
 */
export interface IProfileWithStats {
  profile: IProfile;
  stats: IProfileStats;
  isMe: boolean;
}

/**
 * `PATCH /api/profile/me` body whitelist.
 * 필드는 모두 optional이지만 최소 1개 이상 포함되어야 한다 (서버에서 0개면 400).
 */
export interface IProfileUpdatePayload {
  nickname?: string;
  bio?: string | null;
}

/**
 * `PATCH /api/profile/me` 정상 응답.
 * 실패 케이스는 `{ error: string }` 형태로 별도 처리.
 */
export interface IProfileUpdateResponse {
  data: {
    id: string;
  };
}

/**
 * 닉네임 검증 결과.
 * `ok=false`일 때만 `error` 메시지를 포함.
 */
export interface INicknameValidation {
  ok: boolean;
  error?: string;
}

/**
 * `get_match_history(uuid, integer)` RPC 결과 한 행 (camelCase 매핑).
 * p_user_id 관점의 finished 매치 한 건.
 */
export interface IMatchHistoryEntry {
  matchId: string;
  result: "win" | "loss" | "draw";
  problemTitle: string | null;
  opponentId: string | null;
  opponentNickname: string | null;
  opponentAvatarUrl: string | null;
  myMmrChange: number | null;
  endTime: string | null;
}
