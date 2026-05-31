import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type {
  IResultParticipant,
  IHighlightedCode,
} from "@/app/features/result/types";

/**
 * 참가자 1인의 코드 카드 - 아바타/닉네임/점수/통과 케이스 + Shiki HTML 렌더.
 * dangerouslySetInnerHTML 사용처는 이 컴포넌트로 한정 (Shiki escape에 의존).
 * @param participant 참가자 데이터
 * @param highlighted Shiki 결과 (html + fallback flag)
 * @return 카드 JSX
 */
export default function ParticipantCodeCard({
  participant,
  highlighted,
}: {
  participant: IResultParticipant;
  highlighted: IHighlightedCode;
}) {
  const initials = participant.nickname.slice(0, 2).toUpperCase();

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Avatar>
          {participant.avatarUrl && (
            <AvatarImage
              src={participant.avatarUrl}
              alt={participant.nickname}
            />
          )}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="max-w-[200px] truncate text-sm font-semibold">
            {participant.nickname}
            {participant.isMe && (
              <span className="ml-1 text-xs text-muted-foreground">(나)</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {participant.score}점 · {participant.submission.passedCases}/
            {participant.submission.totalCases} 통과
          </span>
          {participant.mmrChange !== null && (
            <span className="text-xs">
              <span
                className={
                  participant.mmrChange > 0
                    ? "font-semibold text-emerald-600"
                    : participant.mmrChange < 0
                      ? "font-semibold text-red-600"
                      : "font-semibold text-muted-foreground"
                }
              >
                {participant.mmrChange > 0
                  ? `+${participant.mmrChange}`
                  : participant.mmrChange}
              </span>{" "}
              <span className="text-muted-foreground">
                · {participant.tier} {participant.currentMmr}
              </span>
            </span>
          )}
        </div>
      </div>
      <div
        className="overflow-auto text-xs [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!p-4"
        dangerouslySetInnerHTML={{ __html: highlighted.html }}
      />
    </article>
  );
}
