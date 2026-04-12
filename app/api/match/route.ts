import { NextResponse } from "next/server";

import { createClient } from "@/app/shared/lib/supabase/server";

/**
 * 대전 방을 생성하고, 생성자를 첫 번째 참가자로 등록한다.
 * @return 생성된 match 정보
 */
export async function POST() {
  const { client } = await createClient();

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const userId = user.id;

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
