// @supabase/ssr: 서버 환경(Route Handler, Server Component, middleware)에서 쓰는 Supabase 클라이언트 팩토리.
//   브라우저용 createBrowserClient와 달리 쿠키 read/write를 우리가 직접 제어할 수 있게 hook(getAll/setAll)을 받는다.
// NextResponse: Next.js의 응답 객체. redirect/JSON/cookie set을 메서드 한 번으로 처리한다.
// NextRequest: Next.js의 요청 객체. URL/searchParams/cookies를 편하게 꺼낼 수 있게 감싼 wrapper.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// open redirect 방어 유틸. raw next 값이 same-origin 절대경로일 때만 통과시키고, 그 외엔 "/"로 fallback.
// (FRONTEND_REVIEW.md의 "Open redirect" 가이드라인 구현체)
import { sanitizeNext } from "@/app/(auth)/login/_utils/sanitizeNext";

// 이 라우트의 실행 환경을 nodejs로 고정한다.
// Next 16은 default가 nodejs지만 명시적으로 적어둔 이유는:
//   1) Edge runtime은 Node 표준 일부(crypto/Buffer 등)를 지원하지 않아 Supabase 의존성이 깨질 위험이 있고,
//   2) PKCE의 code_verifier 복호화/HMAC 계산은 Node crypto를 쓰는 게 가장 안전하기 때문.
// 즉 "이 라우트는 절대 Edge로 빌드되지 않는다"를 코드로 못 박는 안전 장치다.
export const runtime = "nodejs";

/**
 * OAuth provider redirect를 받아 세션을 교환하고, 닉네임/아바타를 1회 동기화한 뒤
 * `?next` 또는 `/`로 redirect한다. 실패 시 `/login?error=oauth_failed`로 fallback.
 *
 * 응답 NextResponse를 미리 만들어 createServerClient의 setAll에서 그 응답에
 * 직접 쿠키를 set하도록 한다. 그래야 redirect 응답에 새 세션 쿠키가 함께 실린다.
 */
export async function GET(request: NextRequest) {
  // OAuth provider가 우리 콜백으로 보낸 query string을 꺼낸다.
  //   code              : PKCE 인증 코드 (성공 시 발급)
  //   error             : 실패 시 에러 코드 (e.g. "access_denied")
  //   error_description : 실패 사유 텍스트 (provider/Supabase가 친절하게 채워줌)
  // 두 갈래(성공/실패)가 같은 URL로 들어오므로 둘 다 파싱해서 분기해야 한다.
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // 실패 케이스 일괄 처리:
  //   - code가 없거나 (정상 응답이 아님)
  //   - error / error_description이 채워져 있으면 (provider가 거부)
  // 사용자에게는 일반화된 메시지(/login?error=oauth_failed)만 노출 — 구체적 사유는 보안상 숨긴다.
  // (어떤 provider/계정이 실패했는지 외부에 노출하면 정보 누설이 되므로 의도적으로 통일된 에러로 redirect)
  if (!code || errorDescription || errorParam) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  // 로그인 후 돌아갈 경로를 안전하게 정제.
  // sanitizeNext는 raw가 "/dashboard"처럼 same-origin 절대경로일 때만 통과시키고,
  // "https://evil.com" 같은 외부 URL이나 "//evil.com" 같은 protocol-relative URL은 "/"로 떨군다.
  const rawNext = searchParams.get("next");
  const { safeNext } = sanitizeNext({ raw: rawNext });

  // Supabase 연결 정보. NEXT_PUBLIC_ prefix는 빌드 타임에 클라이언트 번들에 박힌다는 의미이고,
  // 이 라우트는 서버에서 실행되므로 그냥 process.env로 읽어 쓴다.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // env 변수 누락 가드.
  // 빌드 시점이 아닌 "요청 시점"에서 검증하는 이유: Vercel에서 env를 빠뜨리고 배포해도 빌드는 통과하기 때문.
  // 실제 OAuth flow가 돌아가는 이 시점에 한 번 더 확인해서, env 누락이면 사용자에게 일반 에러로 떨군다.
  // E_ prefix 에러는 우리 내부 식별 코드(로그 grep 용).
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

  // ⚠️ 핵심 패턴: redirect 응답 객체를 "먼저" 만들어둔다.
  // 아래 createServerClient의 setAll 콜백은 "어떤 응답 객체에" 쿠키를 set할지 스스로 알 수 없다.
  // 그래서 우리가 미리 만든 `response`를 클로저로 캡처해서, setAll 안에서 이 response에 직접 set한다.
  // 이렇게 해야 exchangeCodeForSession이 새로 발급한 세션 쿠키(sb-...-auth-token 등)가
  // "이 redirect 응답"에 함께 실려서 브라우저로 전달된다 → 브라우저는 다음 요청부터 로그인 상태로 인식.
  const response = NextResponse.redirect(new URL(safeNext, request.url));

  // 서버용 Supabase 클라이언트 생성.
  // Browser용과 달리 쿠키 입출력을 어디로 할지 우리가 hook으로 알려줘야 한다.
  //   getAll : Supabase가 세션 토큰을 "읽을" 때 호출. request.cookies에서 그대로 읽어 넘긴다.
  //   setAll : Supabase가 토큰을 갱신/발급해서 "쓸" 때 호출. 위에서 만든 response에 set한다.
  // 이 패턴 덕분에 같은 함수 안에서 "들어오는 쿠키 → 세션 사용 → 새 쿠키 응답에 set"이 자연스럽게 흐른다.
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

  // PKCE 코드 ↔ 세션 토큰 교환.
  // /login에서 signInWithOAuth가 만들었던 code_verifier(브라우저 쿠키에 저장됨)와
  // provider가 보내준 code를 함께 Supabase 인증 서버로 보내, access_token + refresh_token을 받아온다.
  // 성공 시 위 setAll 콜백이 호출되어 세션 쿠키가 response에 자동 set된다.
  // verifier 쿠키와 code가 매치되지 않거나 만료되면 여기서 error가 떨어진다(주로 callback URL 불일치/리트라이).
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(exchangeError);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url),
    );
  }

  // getSession() 대신 getUser()를 쓰는 이유:
  //   getSession()은 쿠키에 들어있는 JWT를 "그대로 디코드"해서 반환 — 서버 검증 없음.
  //   getUser()는 access_token을 들고 Supabase auth 서버에 한 번 더 물어서 진짜 유효한 user를 반환.
  // 즉 "서버에서 신뢰해도 되는 user 정보"가 필요하면 항상 getUser. 약간 느리지만 안전하다.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // user 조회가 실패해도 세션 자체는 위에서 이미 발급됐다(쿠키도 set됨).
  // 따라서 nickname 동기화만 건너뛰고 정상 redirect로 돌려준다 — 로그인 자체는 성공.
  // 닉네임은 다음 요청에서 다시 시도하거나 사용자가 직접 수정 가능하므로 치명적이지 않다.
  if (userError || !user) {
    if (userError) {
      console.error(userError);
    }

    return response;
  }

  // OAuth provider가 보내주는 user_metadata는 provider별로 필드 이름이 다르다.
  //   Google : full_name (e.g. "홍길동"), picture
  //   GitHub : user_name (e.g. "honggildong"), avatar_url, full_name도 있을 수 있음
  // 그래서 fullName → userName 순으로 fallback해서 후보를 결정한다.
  // any cast 안 쓰려고 string | undefined로 좁혀서 ?? null로 정규화.
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null;
  const userName =
    (user.user_metadata?.user_name as string | undefined) ?? null;
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;
  const candidate = fullName ?? userName;

  // 닉네임 후보가 있을 때만 profiles 동기화 시도.
  // profiles row 자체는 auth.users insert trigger(handle_new_user)에서 이미 만들어져 있으므로 update만 하면 된다.
  if (candidate) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ nickname: candidate, avatar_url: avatarUrl })
      .eq("id", user.id);

    // 23505는 PostgreSQL의 unique_violation 에러 코드.
    // profiles.nickname에 UNIQUE 제약이 걸려있어, 이미 같은 닉네임을 쓰는 다른 사용자가 있으면 충돌한다.
    // (e.g. Google에서 "홍길동" 닉네임을 가진 두 번째 사용자가 가입하는 경우)
    if (updateError) {
      const isUniqueViolation =
        (updateError as { code?: string }).code === "23505";

      // 충돌이면 user.id의 앞 4글자를 suffix로 붙여 "홍길동_a1b2" 형태로 재시도.
      // user.id는 UUID라 4글자만 잘라도 충돌 확률이 매우 낮고, 사람이 읽기에도 짧다.
      // 두 번째 시도까지 실패하면 더 이상 retry하지 않고 로그만 남긴다 — 닉네임은 나중에도 수정 가능하므로.
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

  // 처음에 만들어둔 redirect 응답을 그대로 반환.
  // 이 응답에는 이미 (1) safeNext로 가는 302 Location 헤더와 (2) setAll로 set된 세션 쿠키가 모두 실려있다.
  // 브라우저는 이 응답을 받아서 → 쿠키 저장 → safeNext로 자동 이동한다.
  return response;
}
