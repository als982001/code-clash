import { NextResponse } from "next/server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireUser } from "@/app/shared/lib/auth/requireUser";
import { createServiceClient } from "@/app/shared/lib/supabase/service";

const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_HOST =
  process.env.JUDGE0_API_HOST ?? "judge0-ce.p.rapidapi.com";

const LANGUAGE_ID_MAP: Record<string, number> = {
  javascript: 63,
  python: 71,
};

/** 기본 대전 시간 제한 (초) — 15분 */
const DEFAULT_MATCH_TIME_LIMIT = 900;

interface ISubmitBody {
  code: string;
  language: string;
}

interface ITestCaseRow {
  id: string;
  input: string;
  expected_output: string;
}

interface IJudge0Result {
  status: { id: number };
  stdout: string | null;
}

/**
 * 단일 테스트 케이스를 Judge0에 제출하여 통과 여부를 반환한다.
 * @param code 소스코드
 * @param languageId Judge0 언어 ID
 * @param testCase 테스트 케이스
 * @return passed 여부
 */
async function executeTestCase({
  code,
  languageId,
  testCase,
}: {
  code: string;
  languageId: number;
  testCase: ITestCaseRow;
}): Promise<{ passed: boolean }> {
  try {
    const response = await fetch(
      `${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": JUDGE0_API_KEY!,
          "X-RapidAPI-Host": JUDGE0_API_HOST,
        },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.expected_output,
          cpu_time_limit: 2,
          memory_limit: 256000,
        }),
      },
    );

    if (!response.ok) {
      return { passed: false };
    }

    const result: IJudge0Result = await response.json();
    const actualOutput = result.stdout?.trim() ?? null;
    const expectedTrimmed = testCase.expected_output.trim();
    const passed = result.status.id === 3 && actualOutput === expectedTrimmed;

    return { passed };
  } catch (error) {
    console.error(error);

    return { passed: false };
  }
}

/**
 * 점수를 산출한다.
 * Score = (passed / total × 1000) + ((T_max - T_used) / T_max × 500)
 * @param passedCases 통과한 테스트 케이스 수
 * @param totalCases 전체 테스트 케이스 수
 * @param timeMaxSeconds 최대 허용 시간 (초)
 * @param timeUsedSeconds 사용한 시간 (초)
 * @return 산출된 점수
 */
function calculateScore({
  passedCases,
  totalCases,
  timeMaxSeconds,
  timeUsedSeconds,
}: {
  passedCases: number;
  totalCases: number;
  timeMaxSeconds: number;
  timeUsedSeconds: number;
}): { score: number } {
  const accuracyScore = totalCases > 0 ? (passedCases / totalCases) * 1000 : 0;

  const timeBonus =
    timeMaxSeconds > 0
      ? Math.max(0, ((timeMaxSeconds - timeUsedSeconds) / timeMaxSeconds) * 500)
      : 0;

  return { score: Math.round(accuracyScore + timeBonus) };
}

interface ISubmissionRow {
  user_id: string;
  submitted_at: string;
}

interface IParticipantRow {
  user_id: string;
  score: number | null;
}

/**
 * 양쪽 제출이 모두 완료되었을 때 승자를 결정한다.
 * 판정 기준: 점수 높은 유저 → 동점 시 submitted_at이 빠른 유저
 * @param participants 참가자 목록 (score 포함)
 * @param submissions 제출 목록 (submitted_at 포함)
 * @return winnerId (무승부 가능성은 submitted_at으로 해소)
 */
function determineWinner({
  participants,
  submissions,
}: {
  participants: IParticipantRow[];
  submissions: ISubmissionRow[];
}): { winnerId: string | null } {
  if (participants.length < 2) {
    return { winnerId: null };
  }

  const [a, b] = participants;
  const scoreA = a.score ?? 0;
  const scoreB = b.score ?? 0;

  if (scoreA !== scoreB) {
    return { winnerId: scoreA > scoreB ? a.user_id : b.user_id };
  }

  // 동점: submitted_at이 빠른 유저 승리
  const subA = submissions.find((s) => {
    return s.user_id === a.user_id;
  });
  const subB = submissions.find((s) => {
    return s.user_id === b.user_id;
  });

  if (!subA || !subB) {
    return { winnerId: null };
  }

  const timeA = new Date(subA.submitted_at).getTime();
  const timeB = new Date(subB.submitted_at).getTime();

  return { winnerId: timeA <= timeB ? a.user_id : b.user_id };
}

/**
 * 최종 코드를 제출하고, 전체 테스트 케이스(히든 포함)로 채점하여 점수를 산출한다.
 * - 멱등성: matchId + userId 기준 첫 번째 제출만 유효
 * - 점수 산출은 서버사이드에서만 처리 (Anti-Cheat)
 * @param params.matchId 대전 방 ID
 * @param request.body.code 소스코드
 * @param request.body.language 언어 (javascript | python)
 * @return 제출 결과 (점수, 통과 케이스 수)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  if (!JUDGE0_API_URL || !JUDGE0_API_KEY) {
    return NextResponse.json(
      { error: "채점 서버 설정이 누락되었습니다 (E_JUDGE0)." },
      { status: 500 },
    );
  }

  const { matchId } = await params;

  const auth = await requireUser();

  if (!auth.ok) return auth.response;

  const { user, client } = auth;
  const userId = user.id;

  const body: ISubmitBody = await request.json();
  const { code, language } = body;

  if (!code || !language) {
    return NextResponse.json(
      { error: "code, language가 필요합니다." },
      { status: 400 },
    );
  }

  const languageId = LANGUAGE_ID_MAP[language];

  if (!languageId) {
    return NextResponse.json(
      { error: "지원하지 않는 언어입니다." },
      { status: 400 },
    );
  }

  // 멱등성: 이미 제출한 이력이 있으면 기존 결과 반환
  const { data: existingSubmission } = await client
    .from("submissions")
    .select("*")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .single();

  if (existingSubmission) {
    return NextResponse.json({ data: existingSubmission });
  }

  // 매치 정보 조회
  const { data: match, error: matchError } = await client
    .from("matches")
    .select("id, status, problem_id, start_time")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return NextResponse.json(
      { error: "대전 방을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (match.status !== "ongoing") {
    return NextResponse.json(
      { error: "진행 중인 대전이 아닙니다." },
      { status: 400 },
    );
  }

  if (!match.problem_id) {
    return NextResponse.json(
      { error: "배정된 문제가 없습니다." },
      { status: 400 },
    );
  }

  // 참가자 확인
  const { data: participant } = await client
    .from("match_participants")
    .select("id")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return NextResponse.json(
      { error: "대전 참가자가 아닙니다." },
      { status: 403 },
    );
  }

  // 전체 테스트 케이스 조회 (히든 포함) — service role로 RLS bypass.
  // service role 사용은 이 한 곳으로 한정한다. 다른 client 호출까지 service로 확장하면 anti-cheat RLS 검증이 사라진다.
  let serviceClient: SupabaseClient;

  try {
    serviceClient = createServiceClient().client;
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "채점 서버 설정이 누락되었습니다 (E_SERVICE)." },
      { status: 500 },
    );
  }

  const { data: testCases } = await serviceClient
    .from("test_cases")
    .select("id, input, expected_output")
    .eq("problem_id", match.problem_id);

  if (!testCases || testCases.length === 0) {
    return NextResponse.json(
      { error: "테스트 케이스가 없습니다." },
      { status: 500 },
    );
  }

  // Judge0로 전체 테스트 케이스 채점
  const results = await Promise.all(
    testCases.map((testCase) => {
      return executeTestCase({ code, languageId, testCase });
    }),
  );

  const passedCases = results.filter((r) => {
    return r.passed;
  }).length;
  const totalCases = testCases.length;

  // 소요 시간 계산 (start_time이 없으면 시간 보너스 없이 처리)
  const timeUsedSeconds = match.start_time
    ? Math.max(0, (Date.now() - new Date(match.start_time).getTime()) / 1000)
    : DEFAULT_MATCH_TIME_LIMIT;

  const { score } = calculateScore({
    passedCases,
    totalCases,
    timeMaxSeconds: DEFAULT_MATCH_TIME_LIMIT,
    timeUsedSeconds,
  });

  // submissions 테이블에 결과 저장
  const { data: submission, error: submitError } = await client
    .from("submissions")
    .insert({
      user_id: userId,
      match_id: matchId,
      code,
      language,
      status: passedCases === totalCases ? "accepted" : "partial",
      passed_cases: passedCases,
      total_cases: totalCases,
    })
    .select()
    .single();

  if (submitError) {
    console.error(submitError);

    return NextResponse.json(
      { error: "제출 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  // match_participants에 점수 기록 — service-role 로 RLS 우회.
  // anon/authenticated 가 PostgREST PATCH 로 자기 row 의 score 를 임의 값으로 덮어쓰는
  // score write primitive 를 막기 위해 match_participants 의 인가 사용자 UPDATE 는
  // RLS default deny 로 되돌렸다 (`20260516_fix_match_participants_score_write_primitive.sql`).
  // score 갱신은 서버 단독 경로로만 가능. affected row 0 가드는 그대로 둬서
  // 향후 정책 미스매치 회귀가 다시 발생해도 silent fail 없이 500 으로 드러난다.
  const { data: scoreUpdated, error: scoreError } = await serviceClient
    .from("match_participants")
    .update({ score })
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .select("id");

  if (scoreError || !scoreUpdated || scoreUpdated.length === 0) {
    if (scoreError) console.error(scoreError);

    return NextResponse.json(
      { error: "점수 저장에 실패했습니다." },
      { status: 500 },
    );
  }

  // 양쪽 제출 모두 완료됐는지 확인 → 승패 판정
  const { data: allSubmissions } = await client
    .from("submissions")
    .select("user_id, submitted_at")
    .eq("match_id", matchId);

  const { data: allParticipants } = await client
    .from("match_participants")
    .select("user_id, score")
    .eq("match_id", matchId);

  if (
    allSubmissions &&
    allParticipants &&
    allSubmissions.length === 2 &&
    allParticipants.length === 2
  ) {
    const { winnerId } = determineWinner({
      participants: allParticipants,
      submissions: allSubmissions,
    });

    // Race condition 방어: ongoing 일 때만 finished 로 변경.
    // service-role 로 RLS 우회 — 인증된 참가자가 PostgREST PATCH 로 자기 row 의
    // status='finished', winner_id=자기, end_time=now 를 직접 박는 winner write primitive 를
    // 막기 위해 matches.participant_update 정책을 DROP 하고 인가 사용자 UPDATE 를
    // default deny 로 되돌렸다 (`20260516_fix_matches_winner_write_primitive.sql`).
    // matches finalize 는 서버 단독 경로로만 가능. race window 가드 `.eq("status", "ongoing")` 는 그대로.
    const { data: finishedMatch } = await serviceClient
      .from("matches")
      .update({
        status: "finished",
        winner_id: winnerId,
        end_time: new Date().toISOString(),
      })
      .eq("id", matchId)
      .eq("status", "ongoing")
      .select("id");

    // 이미 다른 요청이 판정을 완료했으면 브로드캐스트 스킵
    if (finishedMatch && finishedMatch.length > 0) {
      const scores: Record<string, number> = {};

      allParticipants.forEach((p) => {
        scores[p.user_id] = p.score ?? 0;
      });

      // MATCH_FINISHED 브로드캐스트 (서버 → 클라이언트)
      const channel = client.channel(`match:${matchId}`);

      await channel.send({
        type: "broadcast",
        event: "MATCH_FINISHED",
        payload: {
          winnerId,
          scores,
          mmrChange: {},
        },
      });

      await client.removeChannel(channel);
    }
  }

  return NextResponse.json({
    data: {
      ...submission,
      score,
      passedCases,
      totalCases,
    },
  });
}
