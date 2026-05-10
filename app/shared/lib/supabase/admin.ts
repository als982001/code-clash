import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service_role 키로 RLS를 우회하는 Supabase 클라이언트를 만든다.
 * - 서버 라우트에서 토큰/권한 검증을 직접 수행하는 흐름에서만 사용.
 * - "server-only" import로 클라이언트 번들 유출 차단.
 * @return RLS 우회된 Supabase 클라이언트
 */
export function createAdminClient() {
  return {
    client: createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    ),
  };
}
