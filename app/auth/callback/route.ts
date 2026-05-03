import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * OAuth provider redirect를 받아 세션을 교환하고, 닉네임/아바타를 1회 동기화한 뒤
 * `?next` 또는 `/`로 redirect한다. 실패 시 `/login?error=oauth_failed`로 fallback.
 *
 * 응답 NextResponse를 미리 만들어 createServerClient의 setAll에서 그 응답에
 * 직접 쿠키를 set하도록 한다. 그래야 redirect 응답에 새 세션 쿠키가 함께 실린다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (!code || errorDescription || errorParam) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  const rawNext = searchParams.get("next");
  const safeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      new Error(
        "E_SUPABASE_ENV: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing",
      ),
    );
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  const response = NextResponse.redirect(new URL(safeNext, request.url));

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(exchangeError);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError) {
      console.error(userError);
    }

    return response;
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null;
  const userName =
    (user.user_metadata?.user_name as string | undefined) ?? null;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const candidate = fullName ?? userName;

  if (candidate) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nickname: candidate, avatar_url: avatarUrl })
      .eq("id", user.id);

    if (updateError) {
      const isUniqueViolation =
        (updateError as { code?: string }).code === "23505";

      if (isUniqueViolation) {
        const fallbackNickname = `${candidate}_${user.id.slice(0, 4)}`;

        const { error: fallbackError } = await supabase
          .from("profiles")
          .update({ nickname: fallbackNickname, avatar_url: avatarUrl })
          .eq("id", user.id);

        if (fallbackError) {
          console.error(fallbackError);
        }
      } else {
        console.error(updateError);
      }
    }
  }

  return response;
}
