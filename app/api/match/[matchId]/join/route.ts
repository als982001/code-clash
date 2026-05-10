import { NextResponse } from "next/server";

// requireUser: 쿠키 세션을 서버에서 검증해 user/client를 동시에 돌려주는 헬퍼.
// 비로그인이면 401 응답을 미리 만들어주므로 호출부는 `if (!auth.ok) return auth.response;` 한 줄로 게이트만 통과하면 된다.
import { requireUser } from "@/app/shared/lib/auth/requireUser";

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
  // Next.js 15+ 부터 dynamic route params는 Promise로 들어온다 (서버 흐름 비동기화).
  // 그래서 항상 await으로 풀어 써야 하고, 인터페이스 타입도 Promise<...>로 명시.
  // _request는 사용 안 하므로 underscore prefix로 의도적 미사용임을 알린다 (lint 규칙 회피용도 겸함).
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  // 인증 게이트. 통과 못하면 미리 만들어진 401 response 그대로 반환.
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  // 통과 시 user(서버 검증된)와 client(이 user 컨텍스트가 박힌 supabase 서버 클라이언트)를 함께 받는다.
  // client로 쿼리하면 RLS가 user.id 기준으로 자동 적용되어 "내가 접근 가능한 row"만 보임.
  const { user, client } = auth;
  const userId = user.id;

  // ── match 조회 + 상태 검증 ────────────────────────────────────────
  // .single()은 정확히 1건이 안 나오면 에러로 처리한다 (0건/2건 모두 error로 떨어짐).
  // 여기서는 matchId로 찾으므로 1건이 나와야 정상이고, 없으면 404로 떨군다.
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

  // 'waiting'(호스트만 있는 대기 상태) 외엔 join 불가.
  // 'ongoing'(이미 게임 중) / 'finished'(종료됨) 모두 여기서 차단.
  // 이 검증을 안 하면 종료된 매치에도 참가자가 추가되어 데이터가 깨질 수 있다.
  if (match.status !== "waiting") {
    return NextResponse.json(
      { error: "이미 시작되었거나 종료된 대전입니다." },
      { status: 400 },
    );
  }

  // ── 사전 카운트 체크 (fast path) ─────────────────────────────────
  // 이 시점의 참가자 목록을 가져온다. 보통 [host] 1명만 있어야 정상.
  const { data: existingParticipants } = await client
    .from("match_participants")
    .select("user_id")
    .eq("match_id", matchId);

  // 같은 user가 두 번 입장 시도하는 케이스 차단.
  // (실수 더블 클릭, 다른 탭에서 같은 invite URL 클릭 등)
  if (existingParticipants?.some((p) => p.user_id === userId)) {
    return NextResponse.json(
      { error: "이미 참가한 유저입니다." },
      { status: 400 },
    );
  }

  // 이미 정원(2명) 충족 → 늦게 들어온 케이스. 99%의 "방 만석" 거부가 여기서 잡힌다.
  // insert 자체를 시도하지 않고 즉시 400으로 떨궈 비용을 절약.
  if ((existingParticipants?.length ?? 0) >= 2) {
    return NextResponse.json(
      { error: "대전 방이 가득 찼습니다." },
      { status: 400 },
    );
  }

  // ── participant insert ───────────────────────────────────────────
  // 위 사전 체크를 통과했으니 일단 insert. 하지만 두 게스트가 거의 동시에 도달하면
  // 둘 다 사전 체크를 통과해버려 동시에 insert될 수 있다 (race condition) → 아래 사후 재검증으로 처리.
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
  // insert 직후 실제 참가자 수를 다시 카운트한다.
  // 정상 케이스: 사전 체크 length=1 → insert 후 length=2.
  // race 케이스: 두 게스트가 거의 동시에 사전 체크(length=1) 통과 → 둘 다 insert → length=3.
  // length > 2면 다른 사람이 같은 race를 통과해서 들어왔다는 뜻이므로 "내 row를 다시 삭제"해 정합성 유지.
  // 한계: A/B 모두 length=3을 보면 둘 다 롤백돼 둘 다 실패할 수 있음. 데이터 손상은 없지만 UX 손실.
  // 더 견고하게 하려면 PL/pgSQL 함수로 lock + atomic insert를 짜야 한다 (현재 트래픽 규모상 불필요).
  const { data: verifyParticipants } = await client
    .from("match_participants")
    .select("id, user_id")
    .eq("match_id", matchId);

  if ((verifyParticipants?.length ?? 0) > 2) {
    // 본인 row를 찾아서 삭제 (다른 race 통과자의 row는 그쪽에서 처리할 책임).
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
  // 정확히 2명이면 (= host + 게스트 한 명) 게임 시작 트리거를 발사한다.
  // 이 update 한 번이 호스트 화면(/play/[matchId])의 Realtime 구독을 깨워
  // status 'waiting' → 'ongoing'으로 바뀐 걸 감지하고 게임 UI로 전환되게 한다.
  if ((verifyParticipants?.length ?? 0) === 2) {
    // 전체 problems 테이블에서 1개 랜덤 선택.
    // 매치마다 다른 문제를 주기 위함 — 같은 사람과 여러 번 매치해도 다른 경험.
    // 주의: 컴포넌트 렌더 본문이 아닌 API 라우트(서버)이므로 Math.random() 직접 사용 OK.
    //       (React Compiler의 idempotency 룰은 컴포넌트 본문/hook 본문에만 적용됨)
    const { data: allProblems } = await client.from("problems").select("id");

    let problemId: string | null = null;

    if (allProblems && allProblems.length > 0) {
      const randomIndex = Math.floor(Math.random() * allProblems.length);

      problemId = allProblems[randomIndex].id;
    }

    // status, problem_id, start_time을 한 번에 업데이트.
    // start_time은 서버 시각 기준 ISO 문자열 — 클라이언트의 시계 차이를 무시하기 위해 서버에서 박는다.
    // (만약 클라이언트에서 보낸 시각을 신뢰하면 사용자가 시간 조작으로 타이머를 속일 수 있다)
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

    // 게스트(이 요청자)에게는 ongoing 상태의 match를 돌려준다.
    // 호스트에게는 Realtime 구독이 따로 알려주므로 이 응답이 닿지 않아도 OK.
    return NextResponse.json({ data: updatedMatch });
  }

  // 정원이 아직 안 찼다는 건 이론상 length === 1인 케이스.
  // 현재 정책상 매치는 1:1이라 호스트 1 + 게스트 1이 항상 동시 충족되어야 하지만,
  // 미래에 인원 정책이 바뀌거나 buffering 시나리오가 생길 때를 위해 안전 분기로 남겨둔다.
  return NextResponse.json({ data: match });
}
