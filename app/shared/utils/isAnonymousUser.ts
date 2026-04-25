import type { User } from "@supabase/supabase-js";

/**
 * Supabase User가 익명 세션인지 판별한다.
 * 미들웨어/login/AuthListener/useAuth에서 동일하게 사용해 분기를 단일화한다.
 * @param user 판별 대상 Supabase user 객체 (null 허용)
 * @return { isAnonymous } user가 존재하고 is_anonymous=true이면 true, 아니면 false
 */
export function isAnonymousUser({ user }: { user: User | null }): {
  isAnonymous: boolean;
} {
  return { isAnonymous: user?.is_anonymous === true };
}
