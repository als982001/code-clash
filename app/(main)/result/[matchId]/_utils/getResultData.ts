import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IResultData,
  IResultParticipant,
} from "@/app/features/result/types";

interface IGetResultDataParams {
  client: SupabaseClient;
  matchId: string;
  userId: string;
}

interface IParticipantRow {
  user_id: string;
  score: number | null;
  mmr_change: number | null;
}

interface ISubmissionRow {
  id: string;
  user_id: string;
  code: string;
  language: string;
  passed_cases: number | null;
  total_cases: number | null;
  submitted_at: string;
}

interface IProfileRow {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  mmr: number | null;
  tier: string | null;
}

/**
 * 결과 페이지가 필요로 하는 매치/참가자/제출/프로필 데이터를 병렬 fetch 후 정형한다.
 * RLS 0건(비참가자/매치 부재) 또는 데이터 정합성 실패 시 null 반환 →
 * 호출부(page.tsx)가 notFound()로 처리.
 *
 * RLS 게이트:
 * - matches: matches_self_or_participant_read
 * - match_participants: co_participant_read
 * - submissions: match_participant_read
 * - profiles: profiles_authenticated_read
 *
 * @requires 호출부가 status === "finished" 를 사전 검증해야 함. 반환 객체의 match.status 는
 *           "finished" 리터럴로 좁힌 형태이므로 다른 status 의 매치에 호출하면 타입과 실제가 불일치한다.
 *
 * @param client supabase server client
 * @param matchId 매치 ID
 * @param userId 로그인 사용자 ID (isMe 판정용)
 * @return IResultData | null
 */
export async function getResultData({
  client,
  matchId,
  userId,
}: IGetResultDataParams): Promise<IResultData | null> {
  const [matchRes, participantsRes, submissionsRes] = await Promise.all([
    client
      .from("matches")
      .select("id, status, winner_id, end_time, problem_id, host_id")
      .eq("id", matchId)
      .single(),
    client
      .from("match_participants")
      .select("user_id, score, mmr_change")
      .eq("match_id", matchId),
    client
      .from("submissions")
      .select(
        "id, user_id, code, language, passed_cases, total_cases, submitted_at",
      )
      .eq("match_id", matchId),
  ]);

  if (matchRes.error || !matchRes.data) {
    return null;
  }

  const participants = (participantsRes.data ?? []) as IParticipantRow[];
  const submissions = (submissionsRes.data ?? []) as ISubmissionRow[];

  if (participants.length < 2 || submissions.length < 2) {
    return null;
  }

  const userIds = participants.map((p) => {
    return p.user_id;
  });

  const profilesRes = await client
    .from("profiles")
    .select("id, nickname, avatar_url, mmr, tier")
    .in("id", userIds);

  const profileMap = new Map<string, IProfileRow>();

  ((profilesRes.data ?? []) as IProfileRow[]).forEach((p) => {
    profileMap.set(p.id, p);
  });

  const matchRow = matchRes.data as {
    id: string;
    status: string;
    winner_id: string | null;
    end_time: string | null;
    problem_id: string | null;
    host_id: string | null;
  };

  if (!matchRow.host_id || !matchRow.problem_id || !matchRow.end_time) {
    return null;
  }

  const hostUserId = matchRow.host_id;
  const guestParticipant = participants.find((p) => {
    return p.user_id !== hostUserId;
  });

  if (!guestParticipant) {
    return null;
  }

  const buildParticipant = ({
    uid,
  }: {
    uid: string;
  }): IResultParticipant | null => {
    const participant = participants.find((p) => {
      return p.user_id === uid;
    });
    const submission = submissions.find((s) => {
      return s.user_id === uid;
    });

    if (!participant || !submission) {
      return null;
    }

    const profile = profileMap.get(uid);

    return {
      userId: uid,
      nickname: profile?.nickname ?? "익명",
      avatarUrl: profile?.avatar_url ?? null,
      score: participant.score ?? 0,
      isMe: uid === userId,
      mmrChange: participant.mmr_change,
      currentMmr: profile?.mmr ?? 1000,
      tier: profile?.tier ?? "Bronze",
      submission: {
        id: submission.id,
        code: submission.code,
        language: submission.language,
        passedCases: submission.passed_cases ?? 0,
        totalCases: submission.total_cases ?? 0,
        submittedAt: submission.submitted_at,
      },
    };
  };

  const host = buildParticipant({ uid: hostUserId });
  const guest = buildParticipant({ uid: guestParticipant.user_id });

  if (!host || !guest) {
    return null;
  }

  return {
    match: {
      id: matchRow.id,
      status: matchRow.status as "finished",
      winnerId: matchRow.winner_id,
      endTime: matchRow.end_time,
      problemId: matchRow.problem_id,
      hostId: matchRow.host_id,
    },
    host,
    guest,
  };
}
