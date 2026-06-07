// "server-only": 이 모듈을 실수로 클라이언트 번들에 import하면 빌드 타임에 에러가 나도록 막는 가드.
// API 라우트는 원래 서버에서만 실행되지만, 같은 폴더 구조 안에서 누가 client component에서 import하면
// 위험한 비밀(SUPABASE service key 같은)이 브라우저 번들에 박힐 수 있어 명시적으로 차단한다.
import "server-only";

// NextResponse: API 응답을 만들 때 쓰는 Next.js 헬퍼. .json()이 가장 자주 쓰는 메서드.
import { NextResponse } from "next/server";
// PostgrestError: Supabase가 PostgREST 통해 던지는 에러 타입. code 필드(e.g. "23505")로 분기 가능.
import type { PostgrestError } from "@supabase/supabase-js";

import { MATCH_STATUS } from "@/app/features/match/types";
import type { IInviteMatch } from "@/app/features/match/types/invite";
import { createInviteToken } from "@/app/features/match/utils/createInviteToken";
// requireUser: 인증된 user를 보장하는 헬퍼. 비로그인이면 401 응답 객체를 반환,
// 로그인이면 { ok: true, user, client } 형태로 user + supabase 서버 클라이언트를 함께 넘긴다.
import { requireUser } from "@/app/shared/lib/auth/requireUser";

// runtime을 nodejs로 고정하는 이유:
// createInviteToken이 node:crypto의 randomBytes를 쓰는데 Edge runtime은 이 모듈을 지원하지 않는다.
// 만약 Edge로 빌드되면 import 단계에서 깨지므로 명시적으로 nodejs로 묶어둔다.
export const runtime = "nodejs";

// invite_token UNIQUE 충돌 시 재시도 횟수.
// 16바이트(128비트) random은 사실상 충돌 확률 0이지만, 생일 역설/외부 공격 등을 대비한 방어 장치.
const MAX_TOKEN_RETRY = 3;
// 초대 링크 유효 시간(분). 30분 안에 친구가 입장하지 않으면 expired 처리.
const INVITE_TTL_MIN = 30;

/**
 * 친구 초대 매치를 생성하고, 호스트를 첫 번째 참가자로 등록한다.
 * - invite_token UNIQUE 충돌 시 최대 3회 재발급 후 실패.
 * - 트랜잭션 미지원 → match_participants insert 실패 시 matches row 롤백.
 * @return data IInviteMatch (matchId / inviteToken / inviteUrl / inviteExpiresAt)
 */
export async function POST(request: Request) {
  // 인증 게이트.
  // requireUser는 쿠키에서 세션을 꺼내 supabase.auth.getUser()로 서버 검증까지 끝낸 결과를 돌려준다.
  // 비로그인이면 auth.ok=false + 미리 만들어진 401 응답을 받아 그대로 반환한다 (early return).
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  // 통과하면 user(검증된 사용자)와 client(이 user 컨텍스트가 박힌 supabase 서버 클라이언트)를 동시에 받는다.
  // 이 client로 쿼리하면 RLS도 user.id 기준으로 적용되므로 "내가 쓰는 row만 만들어진다"가 자동 보장.
  const { user, client } = auth;
  const userId = user.id;

  // 만료 시각을 ISO 문자열로 미리 계산. Date.now()는 ms 단위라 60_000을 곱해 분 → ms 변환.
  // 이 값은 retry 루프 안에서 매번 같은 값으로 insert되어야 하므로 루프 밖에서 한 번만 만든다.
  const inviteExpiresAt = new Date(
    Date.now() + INVITE_TTL_MIN * 60 * 1000,
  ).toISOString();

  // retry 루프 결과를 받아둘 변수. 성공 시 루프 안에서 채워지고 break.
  let createdMatchId: string | null = null;
  let createdInviteToken: string | null = null;

  // ── matches insert (with token retry) ─────────────────────────────
  // base64url 22자 토큰을 만들어 matches row를 insert. UNIQUE 충돌(23505)이 나면 새 토큰으로 재시도.
  // 충돌 확률은 사실상 0이지만 "확률이 0이 아니다"를 코드로 인정하고 방어해두는 게 운영 안전성에 좋다.
  for (let attempt = 0; attempt < MAX_TOKEN_RETRY; attempt++) {
    const { token } = createInviteToken();

    const { data: match, error: matchInsertError } = await client
      .from("matches")
      .insert({
        status: MATCH_STATUS.WAITING,
        host_id: userId,
        invite_token: token,
        invite_expires_at: inviteExpiresAt,
      })
      .select()
      .single();

    // 정상 케이스: 변수에 결과 저장 후 루프 탈출.
    if (!matchInsertError && match) {
      createdMatchId = match.id as string;
      createdInviteToken = token;
      break;
    }

    // PostgreSQL 23505 = unique_violation. invite_token UNIQUE 제약에 걸린 케이스만 재시도 대상.
    // 그 외 에러(권한/연결/스키마 문제 등)는 retry해도 의미 없으므로 즉시 500으로 떨어뜨린다.
    const isUniqueViolation =
      (matchInsertError as PostgrestError | null)?.code === "23505";

    if (!isUniqueViolation) {
      console.error(matchInsertError);

      return NextResponse.json(
        { error: "대전 방 생성에 실패했습니다." },
        { status: 500 },
      );
    }
    // 23505면 다음 iteration에서 새 토큰으로 다시 시도.
  }

  // 3번 모두 충돌 났거나(현실적으론 거의 불가능) 알 수 없는 이유로 채워지지 않은 경우.
  if (!createdMatchId || !createdInviteToken) {
    return NextResponse.json(
      { error: "초대 토큰 발급에 실패했습니다." },
      { status: 500 },
    );
  }

  // ── match_participants insert (호스트 등록) ────────────────────────
  // 호스트도 참가자 1명으로 카운트하기 위해 match_participants에 row를 추가한다.
  // 이렇게 해야 게스트가 join할 때 "현재 인원 < 2" 같은 단순한 카운트 체크로 정원 제한을 걸 수 있다.
  const { error: participantError } = await client
    .from("match_participants")
    .insert({
      match_id: createdMatchId,
      user_id: userId,
    });

  // ⚠️ 수동 롤백 패턴.
  // Supabase JS SDK는 클라이언트단 트랜잭션을 지원하지 않는다 (RPC로 PL/pgSQL 함수를 짜면 가능).
  // 따라서 match_participants insert가 실패하면 직전에 만든 matches row가 "고아"로 남게 된다.
  // 이 흐름을 막기 위해 실패 즉시 matches row를 delete해서 정합성을 맞춘다.
  // 완벽하진 않다(롤백 자체가 실패할 수 있음) — 그래서 rollbackError도 로깅만 하고 응답은 500 통일.
  // 더 견고하게 하려면 .rpc("create_invite_match", {...})로 PL/pgSQL 함수에서 BEGIN/COMMIT 처리해야 한다.
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

  // ── inviteUrl 생성 (Origin 헤더 인젝션 방어 — FRONTEND_REVIEW.md 패턴) ─
  // 절대 URL을 만들 때 request.headers.get("origin")만 신뢰하면 위험하다:
  //   curl -X POST .../api/match/invite -H "Origin: https://evil.com" -H "Cookie: <session>"
  //   → 응답 inviteUrl이 https://evil.com/invite/... 가 되어 자기-피싱 벡터가 만들어짐.
  // 그래서 운영자가 통제하는 env 값을 1순위로 두고, fallback으로 header → request.url을 사용한다.
  const envOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const headerOrigin = request.headers.get("origin");

  // request.url 파싱은 비정상 환경(프록시 헤더 손상 등)에서 throw할 수 있어 try/catch로 감싼다.
  let requestUrlOrigin: string | undefined;

  try {
    requestUrlOrigin = new URL(request.url).origin;
  } catch {
    requestUrlOrigin = undefined;
  }

  // 우선순위: env > header > request.url > "" (모두 실패).
  // env가 박혀있는 한 공격자가 헤더를 조작해도 영향이 없다.
  const resolvedOrigin = envOrigin || headerOrigin || requestUrlOrigin || "";

  // 셋 다 비어있는 극단적 케이스 방어. 실서버에선 NEXT_PUBLIC_SITE_URL이 항상 박혀있어야 정상.
  if (!resolvedOrigin) {
    console.warn("invite URL origin을 결정할 수 없습니다.");

    return NextResponse.json(
      { error: "초대 URL 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  // 게스트가 받을 진입점 URL. /invite/[token] 페이지가 토큰으로 matches row를 찾아 join 처리한다.
  const inviteUrl = `${resolvedOrigin}/invite/${createdInviteToken}`;

  // 클라이언트(InviteCard)가 받을 응답 데이터.
  // matchId: 호스트가 "방으로 입장" 누르면 /play/[matchId]로 이동할 때 사용.
  // inviteToken: 디버깅용 (실제 공유에는 inviteUrl을 쓰지만 노출돼도 무방한 값).
  // inviteUrl: 친구에게 공유할 링크.
  // inviteExpiresAt: Dialog에 만료시각 표시 + 클라이언트에서 만료 비교에 사용.
  const responseData: IInviteMatch = {
    matchId: createdMatchId,
    inviteToken: createdInviteToken,
    inviteUrl,
    inviteExpiresAt,
  };

  return NextResponse.json({ data: responseData });
}
