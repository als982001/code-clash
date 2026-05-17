// "server-only": 누가 client component에서 이 모듈을 import하면 빌드 타임에 에러로 차단.
// API 라우트는 본래 서버에서만 실행되지만, 같은 폴더에 있는 헬퍼를 client가 잘못 끌어오는 사고를
// 방지하기 위해 명시적으로 가드한다.
import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import type { PostgrestError } from "@supabase/supabase-js";

import { validateNickname } from "@/app/features/profile/utils/validateNickname";
// requireUser: 인증 게이트. 비로그인 → 401 응답을 그대로 return.
import { requireUser } from "@/app/shared/lib/auth/requireUser";

// runtime을 nodejs로 고정. profiles.update가 Edge에서 동작 자체는 가능하지만, 다른 라우트와의 일관성과
// 향후 node 전용 모듈(예: 이미지 처리) 확장 여지를 위해 nodejs로 통일.
export const runtime = "nodejs";

// bio 최대 길이. UI에서 한 줄 소개 컨셉이라 200자 제한.
const BIO_MAX_LENGTH = 200;

/**
 * 본인 프로필을 부분 갱신한다. nickname / bio 만 화이트리스트로 허용한다.
 *
 * 보안 가드:
 * - requireUser로 인증 확인 → 비로그인 401
 * - body의 id 등 다른 필드는 무시. UPDATE는 `.eq("id", user.id)`로 본인 row만 강제 (FRONTEND_REVIEW
 *   write primitive 가드).
 * - body 파싱 실패 → 400.
 * - 닉네임 UNIQUE 충돌(23505) → 409 + 사용자 친화 메시지.
 * - RLS silent fail 방지: `.select("id").single()` 후 error 또는 data null이면 500
 *   (CODE_CONVENTIONS의 affected row 0건 guard).
 *
 * @param request PATCH 요청 (body는 IProfileUpdatePayload)
 * @return 성공 시 { data: { id } } / 실패 시 { error: string }
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;

  // request.json()은 invalid JSON일 때 throw. catch로 null로 정규화한 뒤 body 검증.
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 화이트리스트 payload만 모은다. id / created_at / wins 같은 다른 필드는 의도적으로 무시.
  const payload: { nickname?: string; bio?: string | null } = {};

  if ("nickname" in body) {
    const raw = body.nickname;
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const { ok, error } = validateNickname({ value: trimmed });

    if (!ok) {
      return NextResponse.json(
        { error: error ?? "닉네임이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    payload.nickname = trimmed;
  }

  if ("bio" in body) {
    const raw = body.bio;

    if (raw === null) {
      payload.bio = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim();

      if (trimmed.length > BIO_MAX_LENGTH) {
        return NextResponse.json(
          { error: "한 줄 소개는 200자 이내로 입력해주세요." },
          { status: 400 },
        );
      }

      // 빈 문자열은 null로 정규화 → DB에는 항상 NULL 또는 의미 있는 값만.
      payload.bio = trimmed.length === 0 ? null : trimmed;
    } else {
      return NextResponse.json(
        { error: "잘못된 요청입니다." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 },
    );
  }

  // .select("id").single() + 결과 null/error 모두 검사 → RLS deny 시 silent 통과 차단.
  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id")
    .single();

  if (error) {
    const pgError = error as PostgrestError;

    // 23505 UNIQUE 위반은 nickname constraint일 때만 409로 매핑한다.
    // 향후 다른 UNIQUE 컬럼이 추가되어도 잘못된 "닉네임 중복" 메시지가 노출되지 않도록 details/message에서
    // "nickname" 문자열을 검사한다. (constraint 이름이 profiles_nickname_key라 message에 포함됨)
    if (pgError.code === "23505") {
      const detail = pgError.details ?? "";
      const message = pgError.message ?? "";

      if (detail.includes("nickname") || message.includes("nickname")) {
        return NextResponse.json(
          { error: "이미 사용 중인 닉네임입니다." },
          { status: 409 },
        );
      }
    }

    console.error(error);

    return NextResponse.json(
      { error: "프로필 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "프로필 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id: user.id } });
}
