import "server-only";

import { GoogleGenAI, Type } from "@google/genai";

import type { IAiReview, IAiReviewContent } from "@/app/features/review/types";

/** 모델명. 운영자가 GEMINI_MODEL env로 교체 가능. 기본값은 안정 flash 버전. */
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/** 입력 토큰 가드 — 코드/지문 길이 상한 */
const MAX_CODE_LENGTH = 8000;
const MAX_DESCRIPTION_LENGTH = 4000;

const SYSTEM_INSTRUCTION = `당신은 10년 차 시니어 풀스택 개발자이자 알고리즘 코치입니다.
유저가 알고리즘 대전에서 제출한 코드를 리뷰합니다.
규칙:
- "내 코드"를 중심으로 리뷰하고, 상대 코드는 비교 컨텍스트로만 사용합니다. 상대 코드 자체를 평가하거나 전체를 노출하지 마세요.
- 한국어로 응답하되 기술 용어는 영어를 병기합니다 (예: 시간 복잡도(time complexity)).
- 코드를 대신 작성해주지 말고, 논리적 개선점과 학습 포인트를 짚어줍니다.
- 응답은 반드시 지정된 JSON 스키마를 따릅니다.`;

interface IGenerateReviewParams {
  problemTitle: string;
  problemDescription: string;
  myCode: string;
  myLanguage: string;
  myPassedCases: number;
  myTotalCases: number;
  opponentCode: string;
  opponentLanguage: string;
}

/**
 * 문자열을 최대 길이로 자른다 (초과 시 말줄임 표기 추가).
 * @param text 원본 문자열
 * @param max 최대 길이
 * @return value 잘린 문자열
 */
function truncate({ text, max }: { text: string; max: number }): {
  value: string;
} {
  if (text.length <= max) {
    return { value: text };
  }

  return { value: `${text.slice(0, max)}\n... (이하 생략)` };
}

/** Gemini 구조화 출력 스키마 — IAiReviewContent + summary */
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    complexity: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING },
        space: { type: Type.STRING },
        rationale: { type: Type.STRING },
      },
      required: ["time", "space", "rationale"],
    },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    improvements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
        },
        required: ["title", "detail"],
      },
    },
    comparison: { type: Type.STRING },
  },
  required: [
    "summary",
    "complexity",
    "strengths",
    "improvements",
    "comparison",
  ],
};

/**
 * 본인 코드를 Gemini로 리뷰한다. 상대 코드는 비교 컨텍스트로만 전달한다.
 * 구조화 출력(responseSchema)으로 IAiReviewContent + summary 형태 JSON을 강제한다.
 * @param params 문제/본인 코드/상대 코드 컨텍스트
 * @return content + summary (IAiReview)
 */
export async function generateReview(
  params: IGenerateReviewParams,
): Promise<IAiReview> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const { value: description } = truncate({
    text: params.problemDescription,
    max: MAX_DESCRIPTION_LENGTH,
  });
  const { value: myCode } = truncate({
    text: params.myCode,
    max: MAX_CODE_LENGTH,
  });
  const { value: opponentCode } = truncate({
    text: params.opponentCode,
    max: MAX_CODE_LENGTH,
  });

  const prompt = `# 문제
제목: ${params.problemTitle}
${description}

# 내 코드 (${params.myLanguage}) — 통과 ${params.myPassedCases}/${params.myTotalCases}
\`\`\`${params.myLanguage}
${myCode}
\`\`\`

# 상대 코드 (${params.opponentLanguage}) — 비교 컨텍스트
\`\`\`${params.opponentLanguage}
${opponentCode}
\`\`\`

위 "내 코드"를 리뷰해줘. 시간/공간 복잡도, 강점, 개선점, 그리고 상대 코드와 비교한 한두 문장을 JSON으로 작성해줘.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;

  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  const parsed = JSON.parse(text) as IAiReviewContent & { summary: string };

  const { summary, ...content } = parsed;

  return { content, summary };
}
