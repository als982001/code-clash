import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버 환경(Server Component, API Route)에서 사용하는 Supabase 클라이언트를 생성한다.
 * @return Supabase 서버 클라이언트 인스턴스
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return {
    client: createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // Server Component에서 호출 시 쿠키 설정 불가 — 무시
            }
          },
        },
      },
    ),
  };
};
