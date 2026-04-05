import { NextResponse } from "next/server";

import { createClient } from "@/app/shared/lib/supabase/server";

interface ICreateMatchBody {
  userId: string;
}

/**
 * 대전 방을 생성하고, 생성자를 첫 번째 참가자로 등록한다.
 * TODO: Step 3에서 Auth 도입 후 userId를 세션에서 추출하도록 변경
 * @param request.body.userId 방 생성자의 유저 ID
 * @return 생성된 match 정보
 */
export async function POST(request: Request) {
  const body: ICreateMatchBody = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json(
      { error: "userId가 필요합니다." },
      { status: 400 },
    );
  }

  const { client } = await createClient();

  const { data: match, error: matchError } = await client
    .from("matches")
    .insert({ status: "waiting" })
    .select()
    .single();

  if (matchError) {
    console.error(matchError);

    return NextResponse.json(
      { error: "대전 방 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  const { error: participantError } = await client
    .from("match_participants")
    .insert({
      match_id: match.id,
      user_id: userId,
    });

  if (participantError) {
    console.error(participantError);

    await client.from("matches").delete().eq("id", match.id);

    return NextResponse.json(
      { error: "참가자 등록에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: match });
}
