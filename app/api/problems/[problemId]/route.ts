import { NextResponse } from "next/server";

import { requireUser } from "@/app/shared/lib/auth/requireUser";

/**
 * 단일 문제를 상세 조회한다.
 * 공개 테스트 케이스(is_hidden: false)만 포함하여 반환한다.
 * @param params.problemId 조회할 문제의 UUID
 * @return 문제 상세 정보 + 공개 테스트 케이스
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ problemId: string }> },
) {
  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { client } = auth;
  const { problemId } = await params;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(problemId)) {
    return NextResponse.json(
      { error: "잘못된 문제 ID 형식입니다." },
      { status: 400 },
    );
  }

  const { data: problem, error: problemError } = await client
    .from("problems")
    .select(
      "id, title, description, input_format, output_format, examples, difficulty, time_limit, memory_limit, tags",
    )
    .eq("id", problemId)
    .single();

  if (problemError) {
    return NextResponse.json(
      { error: "문제를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: testCases, error: testCasesError } = await client
    .from("test_cases")
    .select("id, input, expected_output")
    .eq("problem_id", problemId)
    .eq("is_hidden", false);

  if (testCasesError) {
    return NextResponse.json(
      { error: testCasesError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    data: {
      ...problem,
      testCases,
    },
  });
}
