import { NextResponse } from "next/server";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient } from "@/app/shared/lib/supabase/server";

interface IRequireUserSuccess {
  ok: true;
  user: User;
  client: SupabaseClient;
}

interface IRequireUserFailure {
  ok: false;
  response: NextResponse;
}

/**
 * API 라우트에서 사용자 인증을 강제한다.
 * 인증 실패 시 401 JSON 응답을, 성공 시 user와 server Supabase client를 반환한다.
 * 호출부에서 추가로 createClient()를 호출하지 않고 반환된 client를 그대로 재사용한다.
 * @return ok=true: { ok, user, client }, ok=false: { ok, response }
 */
export async function requireUser(): Promise<
  IRequireUserSuccess | IRequireUserFailure
> {
  const { client } = await createClient();

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    const response = NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    );

    return { ok: false, response };
  }

  return { ok: true, user, client };
}
