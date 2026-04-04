import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저 환경에서 사용하는 Supabase 클라이언트를 생성한다.
 * @return Supabase 브라우저 클라이언트 인스턴스
 */
export const createClient = () => {
  return {
    client: createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
  };
};
