import { NextResponse } from "next/server";

import { createClient } from "@/app/shared/lib/supabase/server";

/**
 * 전체 문제 목록을 조회한다.
 * 테스트 케이스는 포함하지 않으며, 난이도/태그 정보만 반환한다.
 * @return 문제 목록 배열
 */
export async function GET() {
  const { client } = await createClient();

  const { data, error } = await client
    .from("problems")
    .select("id, title, difficulty, tags, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
