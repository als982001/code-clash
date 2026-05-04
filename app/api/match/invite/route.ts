import "server-only";

import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { createInviteToken } from "@/app/features/match/utils/createInviteToken";
import type { IInviteMatch } from "@/app/features/match/types/invite";
import { requireUser } from "@/app/shared/lib/auth/requireUser";

export const runtime = "nodejs";

const MAX_TOKEN_RETRY = 3;
const INVITE_TTL_MIN = 30;

/**
 * 친구 초대 매치를 생성하고, 호스트를 첫 번째 참가자로 등록한다.
 * - invite_token UNIQUE 충돌 시 최대 3회 재발급 후 실패.
 * - 트랜잭션 미지원 → match_participants insert 실패 시 matches row 롤백.
 * @return data IInviteMatch (matchId / inviteToken / inviteUrl / inviteExpiresAt)
 */
export async function POST(request: Request) {
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;
  const userId = user.id;

  const inviteExpiresAt = new Date(
    Date.now() + INVITE_TTL_MIN * 60 * 1000,
  ).toISOString();

  let createdMatchId: string | null = null;
  let createdInviteToken: string | null = null;

  for (let attempt = 0; attempt < MAX_TOKEN_RETRY; attempt++) {
    const { token } = createInviteToken();

    const { data: match, error: matchInsertError } = await client
      .from("matches")
      .insert({
        status: "waiting",
        host_id: userId,
        invite_token: token,
        invite_expires_at: inviteExpiresAt,
      })
      .select()
      .single();

    if (!matchInsertError && match) {
      createdMatchId = match.id as string;
      createdInviteToken = token;
      break;
    }

    const isUniqueViolation =
      (matchInsertError as PostgrestError | null)?.code === "23505";

    if (!isUniqueViolation) {
      console.error(matchInsertError);

      return NextResponse.json(
        { error: "대전 방 생성에 실패했습니다." },
        { status: 500 },
      );
    }
  }

  if (!createdMatchId || !createdInviteToken) {
    return NextResponse.json(
      { error: "초대 토큰 발급에 실패했습니다." },
      { status: 500 },
    );
  }

  const { error: participantError } = await client
    .from("match_participants")
    .insert({
      match_id: createdMatchId,
      user_id: userId,
    });

  if (participantError) {
    console.error(participantError);

    const { error: rollbackError } = await client
      .from("matches")
      .delete()
      .eq("id", createdMatchId);

    if (rollbackError) {
      console.error(rollbackError);
    }

    return NextResponse.json(
      { error: "참가자 등록에 실패했습니다." },
      { status: 500 },
    );
  }

  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const headerOrigin = request.headers.get("origin");

  let requestUrlOrigin: string | undefined;

  try {
    requestUrlOrigin = new URL(request.url).origin;
  } catch {
    requestUrlOrigin = undefined;
  }

  const resolvedOrigin = envOrigin || headerOrigin || requestUrlOrigin || "";

  if (!resolvedOrigin) {
    console.warn("invite URL origin을 결정할 수 없습니다.");

    return NextResponse.json(
      { error: "초대 URL 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  const inviteUrl = `${resolvedOrigin}/invite/${createdInviteToken}`;

  const responseData: IInviteMatch = {
    matchId: createdMatchId,
    inviteToken: createdInviteToken,
    inviteUrl,
    inviteExpiresAt,
  };

  return NextResponse.json({ data: responseData });
}
