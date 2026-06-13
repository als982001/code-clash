import { notFound } from "next/navigation";

import type { IProfile } from "@/app/features/profile/types";
import { getMatchHistory } from "@/app/features/profile/utils/getMatchHistory";
import { getProfileStats } from "@/app/features/profile/utils/getProfileStats";
import { createClient } from "@/app/shared/lib/supabase/server";

import { ProfileView } from "./_components/ProfileView";

/**
 * Step 3 프로필 PR (#18): 프로필 페이지 (server component).
 *
 * 흐름:
 * 1. middleware가 `/profile` prefix 비로그인 접근을 막으므로 일반적인 경로에서는 user가 반드시 존재.
 *    그래도 방어적으로 null 가드를 둔다.
 * 2. 본인 여부(isMe)는 url params.userId와 인증된 user.id 비교로 판정.
 * 3. profile fetch + stats RPC를 Promise.all로 병렬 처리 (round-trip 절반).
 * 4. profile row가 없으면 notFound() — 존재하지 않는 userId 또는 backfill 누락 케이스.
 *
 * 왜 RPC로 stats를 분리했나:
 * matches/match_participants 의 SELECT RLS는 본인 row만 노출 → 타인 프로필 진입 시 직접 집계가 0으로
 * 잘못 나오는 회귀를 방지하기 위해 SECURITY DEFINER RPC를 따로 둔다 (getProfileStats 주석 참고).
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { client } = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    // 미들웨어가 차단해야 하지만, 누락 케이스 대비 — 그냥 404로 처리해서 user 존재 여부 자체를
    // 노출하지 않는다 (정보 노출 최소화 원칙).
    notFound();
  }

  const isMe = user.id === userId;

  const [profileRes, statsRes, historyRes] = await Promise.all([
    client
      .from("profiles")
      .select("id, nickname, avatar_url, bio, created_at, mmr")
      .eq("id", userId)
      .maybeSingle(),
    getProfileStats({ userId, client }),
    getMatchHistory({ userId, client, limit: 20 }),
  ]);

  if (profileRes.error) {
    console.error(profileRes.error);
    notFound();
  }

  if (!profileRes.data) {
    notFound();
  }

  // PostgREST 결과 row → IProfile로 좁힌다. 셀렉트 컬럼과 1:1 매칭이므로 안전.
  const profile = profileRes.data as IProfile;

  return (
    <ProfileView
      profile={profile}
      stats={statsRes.stats}
      history={historyRes.history}
      isMe={isMe}
    />
  );
}
