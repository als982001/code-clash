import { type NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { sanitizeNext } from "@/app/(auth)/login/_utils/sanitizeNext";
import { isProtectedPath } from "@/app/shared/lib/auth/protectedPaths";

/**
 * 모든 요청에서 Supabase 세션 쿠키를 갱신한다.
 * 보호 prefix 미인증 접근은 `/login?next=...`로 SSR 단계에서 redirect한다.
 * `/api/*`는 redirect 대상에서 제외하고 쿠키 갱신만 수행한다 (각 핸들러가 401 JSON 처리).
 * @param request Next.js 미들웨어 요청 객체
 * @return 쿠키가 갱신된 응답 객체 또는 redirect 응답
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // /api/* 는 쿠키 갱신만 수행하고 redirect는 하지 않는다 (각 핸들러가 401 JSON 처리).
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  const { isProtected } = isProtectedPath({ pathname });

  if (isProtected && !user) {
    const rawNext = search
      ? `${pathname}?${search.replace(/^\?/, "")}`
      : pathname;
    const { safeNext } = sanitizeNext({ raw: rawNext });
    const loginUrl = new URL(
      `/login?next=${encodeURIComponent(safeNext)}`,
      request.url,
    );

    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
