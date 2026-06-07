import "server-only";

import { codeToHtml } from "shiki";

import type { IHighlightedCode } from "@/app/features/result/types";

/** Judge0 언어 키와 Shiki 언어 키가 일치하는 화이트리스트. 미지원은 폴백. */
const SUPPORTED_LANGUAGES = ["javascript", "python"] as const;

type TSupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * 입력 문자열을 HTML 엔티티 escape하여 <pre><code> 폴백 안전성을 보장한다.
 * @param input escape 대상 문자열
 * @return { html: escaped 문자열 }
 */
function escapeHtml({ input }: { input: string }): { html: string } {
  const html = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return { html };
}

/**
 * 제출 코드를 Shiki로 server-side 하이라이팅한다.
 * 미지원 언어 / Shiki 에러 시 escape된 <pre><code> 폴백을 반환하고 fallback=true로 표기.
 * @param code 소스코드 원문
 * @param language Judge0 언어 키 ("javascript" | "python" 등)
 * @return IHighlightedCode { html, fallback }
 */
export async function highlightCode({
  code,
  language,
}: {
  code: string;
  language: string;
}): Promise<IHighlightedCode> {
  const isSupported = (SUPPORTED_LANGUAGES as readonly string[]).includes(
    language,
  );

  if (!isSupported) {
    const { html: escaped } = escapeHtml({ input: code });

    return { html: `<pre><code>${escaped}</code></pre>`, fallback: true };
  }

  try {
    const html = await codeToHtml(code, {
      lang: language as TSupportedLanguage,
      theme: "github-dark",
    });

    return { html, fallback: false };
  } catch (error) {
    console.error(error);

    const { html: escaped } = escapeHtml({ input: code });

    return { html: `<pre><code>${escaped}</code></pre>`, fallback: true };
  }
}
