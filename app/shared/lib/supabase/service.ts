import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase Service Role 클라이언트를 생성한다.
 * RLS를 bypass하므로 히든 테스트 케이스 등 민감 데이터 접근 시에만 사용한다.
 * 클라이언트 번들에 포함되면 즉시 키 유출이므로 import "server-only" 가드를 둔다.
 * @return service-role 권한의 Supabase 클라이언트
 */
export const createServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role 환경 변수가 설정되지 않았습니다.");
  }

  return {
    client: createSupabaseClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
};
