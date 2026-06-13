/**
 * 닉네임이 익명 게스트(Anon_) 형식인지 판정한다.
 * 리더보드 제외 정책(NOT LIKE 'Anon\_%')과 동일 기준. handle_new_user 트리거의
 * Player_ 형식(닉네임 미설정 정식 유저)은 익명으로 보지 않는다 — 그들은 정식 프로필 보유.
 * @param nickname 검사 대상 닉네임 (null 허용)
 * @return isAnonymous Anon_ prefix 면 true
 */
export function isAnonymousNickname({
  nickname,
}: {
  nickname: string | null;
}): { isAnonymous: boolean } {
  if (!nickname) {
    return { isAnonymous: false };
  }

  return { isAnonymous: nickname.startsWith("Anon_") };
}
