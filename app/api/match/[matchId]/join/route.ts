import { NextResponse } from "next/server";

import { createClient } from "@/app/shared/lib/supabase/server";

/**
 * 대전 방에 참가한다. 2명이 모이면 자동으로 게임을 시작한다.
 * - status를 ongoing으로 변경
 * - 랜덤 문제 배정
 * - start_time 기록
 * @param params.matchId 참가할 대전 방 ID
 * @return 업데이트된 match 정보
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

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
    .select("id, status")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: "대전 방을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (match.status !== "waiting") {
    return NextResponse.json(
      { error: "이미 시작되었거나 종료된 대전입니다." },
      { status: 400 },
    );
  }

  const { data: existingParticipants } = await client
    .from("match_participants")
    .select("user_id")
    .eq("match_id", matchId);

  if (existingParticipants?.some((p) => p.user_id === userId)) {
    return NextResponse.json(
      { error: "이미 참가한 유저입니다." },
      { status: 400 },
    );
  }

  if ((existingParticipants?.length ?? 0) >= 2) {
    return NextResponse.json(
      { error: "대전 방이 가득 찼습니다." },
      { status: 400 },
    );
  }

  const { error: joinError } = await client.from("match_participants").insert({
    match_id: matchId,
    user_id: userId,
  });

  if (joinError) {
    console.error(joinError);

    return NextResponse.json(
      { error: "참가에 실패했습니다." },
      { status: 500 },
    );
  }

  // Race condition 방어: insert 후 실제 참가자 수 재확인
  const { data: verifyParticipants } = await client
    .from("match_participants")
    .select("id, user_id")
    .eq("match_id", matchId);

  if ((verifyParticipants?.length ?? 0) > 2) {
    // 초과 참가자 롤백 (본인 삭제)
    const myParticipant = verifyParticipants?.find((p) => p.user_id === userId);

    if (myParticipant) {
      await client
        .from("match_participants")
        .delete()
        .eq("id", myParticipant.id);
    }

    return NextResponse.json(
      { error: "대전 방이 가득 찼습니다." },
      { status: 400 },
    );
  }

  if ((verifyParticipants?.length ?? 0) === 2) {
    // 전체 문제 목록에서 랜덤 선택
    const { data: allProblems } = await client.from("problems").select("id");

    let problemId: string | null = null;

    if (allProblems && allProblems.length > 0) {
      const randomIndex = Math.floor(Math.random() * allProblems.length);

      problemId = allProblems[randomIndex].id;
    }

    const { data: updatedMatch, error: updateError } = await client
      .from("matches")
      .update({
        status: "ongoing",
        problem_id: problemId,
        start_time: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select()
      .single();

    if (updateError) {
      console.error(updateError);

      return NextResponse.json(
        { error: "게임 시작 처리에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updatedMatch });
  }

  return NextResponse.json({ data: match });
}
