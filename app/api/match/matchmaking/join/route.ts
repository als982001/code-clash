import "server-only";

import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { IMatchmakingJoinResult } from "@/app/features/match/types/matchmaking";
import { requireUser } from "@/app/shared/lib/auth/requireUser";
import { createServiceClient } from "@/app/shared/lib/supabase/service";

// RPC가 PL/pgSQL이라 nodejs runtime 강제는 불필요하나, service-role 사용 라우트 컨벤션 통일.
export const runtime = "nodejs";

// profiles.mmr가 NULL인 레거시 row 방어용 기본값 (Step 4.5 default와 동일).
const DEFAULT_MMR = 1000;

/**
 * 자동 매칭 큐에 진입하고 즉시 매칭을 시도한다.
 * - 대기 중인 상대가 있으면 RPC가 매치를 생성하고 matched=true + matchId 반환.
 * - 없으면 큐에 등록하고 matched=false 반환(클라이언트는 Realtime으로 대기).
 * @return data IMatchmakingJoinResult
 */
export async function POST() {
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;
  const userId = user.id;

  // 본인 MMR 조회 (anon client — 본인 profiles는 RLS로 read 가능).
  const { data: profile } = await client
    .from("profiles")
    .select("mmr")
    .eq("id", userId)
    .single();

  const mmr = profile?.mmr ?? DEFAULT_MMR;

  // 매칭은 다른 유저의 큐 row 탐색 + matches/match_participants 생성이 필요 →
  // matches RLS(host/participant 한정)와 충돌하므로 service-role RPC로 우회.
  let serviceClient: SupabaseClient;

  try {
    serviceClient = createServiceClient().client;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "매칭 서버 설정이 누락되었습니다 (E_SERVICE)." },
      { status: 500 },
    );
  }

  const { data, error } = await serviceClient.rpc("find_or_enqueue_match", {
    p_user_id: userId,
    p_mmr: mmr,
  });

  if (error) {
    console.error(error);

    return NextResponse.json(
      { error: "매칭 처리에 실패했습니다." },
      { status: 500 },
    );
  }

  // RETURNS TABLE은 행 배열로 온다. 첫 행만 사용.
  const row = Array.isArray(data) ? data[0] : data;
  const matched = Boolean(row?.matched);
  const matchId = (row?.out_match_id as string | null) ?? null;

  const result: IMatchmakingJoinResult =
    matched && matchId ? { matched: true, matchId } : { matched: false };

  return NextResponse.json({ data: result });
}
