import { redirect } from "next/navigation";

import { createClient } from "@/app/shared/lib/supabase/server";

/**
 * Step 3 프로필 PR (#18): 본인 프로필 redirect 엔트리.
 *
 * 흐름:
 * 1. 미들웨어가 이미 `/profile` prefix를 가드하지만, 그래도 방어적으로 user를 한 번 더 확인한다.
 * 2. user가 없으면 `/login?next=/profile/me`로 보낸다 (round-trip 후 다시 이 페이지로 복귀).
 *    sanitizeNext 가드는 미들웨어 redirect와 LoginPage 양쪽에서 이미 적용되므로 여기선 단순 raw 경로만 넘긴다.
 * 3. user가 있으면 `/profile/<userId>`로 영구 redirect → 실제 페이지는 단 하나의 동적 라우트로 통일.
 */
export default async function ProfileMePage() {
  const { client } = await createClient();

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile/me")}`);
  }

  redirect(`/profile/${user.id}`);
}
