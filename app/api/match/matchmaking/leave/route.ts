import "server-only";

import { NextResponse } from "next/server";

import { requireUser } from "@/app/shared/lib/auth/requireUser";

/**
 * 자동 매칭 큐에서 이탈(취소)한다.
 * - self_delete RLS로 본인 큐 row만 삭제(anon client, service-role 불필요).
 * - 멱등: 삭제할 row가 0건이어도 정상(이미 매칭됐거나 큐에 없던 경우).
 * @return data { left: true }
 */
export async function POST() {
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;

  const { error } = await client
    .from("matchmaking_queue")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: "매칭 취소에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { left: true } });
}
