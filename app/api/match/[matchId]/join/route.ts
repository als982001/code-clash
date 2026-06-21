import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

// requireUser: 쿠키 세션을 서버에서 검증해 user를 보장하는 헬퍼.
import { MATCH_STATUS } from "@/app/features/match/types";
import { requireUser } from "@/app/shared/lib/auth/requireUser";
// service client: service_role 키 RLS 우회 싱글턴 (fail-fast).
// matches RLS가 host/participant 한정으로 좁혀진 후 토큰 검증/정원 체크/INSERT/UPDATE를
// 라우트가 직접 수행하려면 RLS 우회가 필요하다. requireUser + 토큰 검증을 사전에 통과한 후에만 사용.
import { createServiceClient } from "@/app/shared/lib/supabase/service";

/**
 * 대전 방에 참가한다. 2명이 모이면 자동으로 게임을 시작한다.
 * - body.token이 매치의 invite_token과 일치할 때만 허용 (매치 hijack 차단)
 * - status를 ongoing으로 변경
 * - 랜덤 문제 배정 + start_time 기록
 * @param params.matchId 참가할 대전 방 ID
 * @return 업데이트된 match 정보
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  // 인증 게이트
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const userId = auth.user.id;

  // 게스트가 보낸 invite_token 추출 (이후 매치의 invite_token과 비교)
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
  };
  const requestToken = body?.token;

  let client: SupabaseClient;

  try {
    client = createServiceClient().client;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "초대 검증 서버 설정이 누락되었습니다 (E_SERVICE)." },
      { status: 500 },
    );
  }

  // ── match 조회 + 상태 검증 ────────────────────────────────────────
  const { data: match, error: matchError } = await client
    .from("matches")
    .select("id, status, host_id, invite_token")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: "대전 방을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (match.status !== MATCH_STATUS.WAITING) {
    return NextResponse.json(
      { error: "이미 시작되었거나 종료된 대전입니다." },
      { status: 400 },
    );
  }

  // 호스트 본인은 join 대상이 아님 (이미 invite API에서 host로 등록됨).
  // /invite/[token] 페이지에서 호스트는 자동 redirect되지만 직접 호출 케이스 차단.
  if (match.host_id === userId) {
    return NextResponse.json(
      { error: "호스트는 자기 매치에 참가할 수 없습니다." },
      { status: 400 },
    );
  }

  // ⭐ ── invite_token 검증 (매치 hijack 차단) ───────────────────────
  // 토큰 모르는 사용자가 match id만으로 임의 매치에 난입하는 케이스 차단.
  // body.token이 매치의 invite_token과 정확히 일치할 때만 허용.
  if (!requestToken || match.invite_token !== requestToken) {
    return NextResponse.json(
      { error: "유효하지 않은 초대입니다." },
      { status: 403 },
    );
  }

  // ── 사전 카운트 체크 (fast path) ─────────────────────────────────
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

  // ── participant insert ───────────────────────────────────────────
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

  // ⚠️ ── 사후 재검증 (race condition 방어) ──────────────────────────
  const { data: verifyParticipants } = await client
    .from("match_participants")
    .select("id, user_id")
    .eq("match_id", matchId);

  if ((verifyParticipants?.length ?? 0) > 2) {
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

  // ── 정원 충족 시 게임 시작 처리 ────────────────────────────────────
  if ((verifyParticipants?.length ?? 0) === 2) {
    const { data: allProblems } = await client.from("problems").select("id");

    let problemId: string | null = null;

    if (allProblems && allProblems.length > 0) {
      const randomIndex = Math.floor(Math.random() * allProblems.length);

      problemId = allProblems[randomIndex].id;
    }

    const { data: updatedMatch, error: updateError } = await client
      .from("matches")
      .update({
        status: MATCH_STATUS.ONGOING,
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
