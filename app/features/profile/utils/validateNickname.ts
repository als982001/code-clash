import type { INicknameValidation } from "@/app/features/profile/types";

/**
 * Step 3 프로필 PR (#18): 닉네임 형식 검증.
 * 클라이언트 폼 disable + 서버 라우트 400 양쪽에서 동일하게 사용한다.
 *
 * 규칙:
 * - trim 후 길이 1~20자
 * - 유니코드 letter/digit + `_` + `-` 만 허용 (`/^[\p{L}\p{N}_-]+$/u`)
 *   한글/일문/중문/이모지 등도 letter 범주에 포함되므로 다국어 사용자 친화적.
 *   공백/특수문자는 PostgREST 쿼리 및 URL 안전성 측면에서 거부.
 */
const NICKNAME_PATTERN = /^[\p{L}\p{N}_-]+$/u;
const MIN_LENGTH = 1;
const MAX_LENGTH = 20;

/**
 * 닉네임이 유효한 형식인지 검사한다. trim은 호출자가 처리한다고 가정한다.
 * @param value 검사 대상 문자열
 * @return ok 통과 여부, error 실패 시 사용자에게 보여줄 한국어 메시지
 */
export function validateNickname({
  value,
}: {
  value: string;
}): INicknameValidation {
  if (typeof value !== "string") {
    return { ok: false, error: "닉네임을 입력해주세요." };
  }

  if (value.length < MIN_LENGTH) {
    return { ok: false, error: "닉네임을 입력해주세요." };
  }

  if (value.length > MAX_LENGTH) {
    return { ok: false, error: "닉네임은 20자 이내로 입력해주세요." };
  }

  if (!NICKNAME_PATTERN.test(value)) {
    return {
      ok: false,
      error: "닉네임에는 문자, 숫자, _, - 만 사용할 수 있습니다.",
    };
  }

  return { ok: true };
}
