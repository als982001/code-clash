import Link from "next/link";

import type { IMatchHistoryEntry } from "@/app/features/profile/types";
import { formatJoinDate } from "@/app/features/profile/utils/formatJoinDate";
import { isAnonymousNickname } from "@/app/features/profile/utils/isAnonymousNickname";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface IProps {
  history: IMatchHistoryEntry[];
}

const RESULT_LABEL: Record<IMatchHistoryEntry["result"], string> = {
  win: "승",
  loss: "패",
  draw: "무",
};

const RESULT_CLASS: Record<IMatchHistoryEntry["result"], string> = {
  win: "bg-primary/15 text-primary",
  loss: "bg-muted text-muted-foreground",
  draw: "bg-secondary text-secondary-foreground",
};

/**
 * 닉네임 첫 글자 Avatar fallback. ProfileView 와 동일 패턴이지만 의존성을 만들지 않기 위해
 * 본 파일에 로컬로 둔다.
 * @param nickname 사용자 닉네임 (null 허용)
 * @return initial 항상 1글자 string ("?" fallback)
 */
function getAvatarInitial({ nickname }: { nickname: string | null }): {
  initial: string;
} {
  if (!nickname || nickname.length === 0) {
    return { initial: "?" };
  }

  return { initial: nickname.charAt(0).toUpperCase() };
}

/**
 * Post-MVP A-5: 대전 히스토리 카드 (presentational).
 * 부모 ProfileView 가 client 컴포넌트이므로 별도 "use client" 불필요.
 * 행 전체가 /result/[matchId] Link — 상대는 텍스트 표시만(중첩 anchor 회피).
 */
export function MatchHistorySection({ history }: IProps) {
  return (
    <Card>
      <CardContent>
        <h2 className="mb-3 font-heading text-base font-medium">
          대전 히스토리
        </h2>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 대전 기록이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((entry) => (
              <MatchHistoryRow key={entry.matchId} entry={entry} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface IRowProps {
  entry: IMatchHistoryEntry;
}

/**
 * 히스토리 한 행. 결과 배지 + 상대 아바타/닉네임 + 문제 제목 + (MMR 변동) + 날짜.
 * 날짜 파생은 외부 헬퍼(formatJoinDate)로 격리 — React 19 Compiler idempotency 가드.
 */
function MatchHistoryRow({ entry }: IRowProps) {
  const { isAnonymous } = isAnonymousNickname({
    nickname: entry.opponentNickname,
  });

  const { label: dateLabel } = formatJoinDate({ isoString: entry.endTime });

  const opponentLabel = isAnonymous
    ? "익명 상대"
    : (entry.opponentNickname ?? "상대 정보 없음");

  const { initial } = getAvatarInitial({
    nickname: isAnonymous ? null : entry.opponentNickname,
  });

  const showMmr = entry.myMmrChange !== null;
  const mmrPositive = (entry.myMmrChange ?? 0) >= 0;

  return (
    <li>
      <Link
        href={`/result/${entry.matchId}`}
        className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
      >
        <span
          className={`inline-flex w-7 shrink-0 items-center justify-center rounded-md py-1 text-xs font-semibold ${RESULT_CLASS[entry.result]}`}
        >
          {RESULT_LABEL[entry.result]}
        </span>

        <Avatar size="sm">
          {!isAnonymous && entry.opponentAvatarUrl ? (
            <AvatarImage src={entry.opponentAvatarUrl} alt={opponentLabel} />
          ) : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{opponentLabel}</span>
          <span className="truncate text-xs text-muted-foreground">
            {entry.problemTitle ?? "(삭제된 문제)"}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {showMmr ? (
            <span
              className={`text-xs font-semibold ${
                mmrPositive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {mmrPositive ? "+" : ""}
              {entry.myMmrChange}
            </span>
          ) : null}
          {dateLabel ? (
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
