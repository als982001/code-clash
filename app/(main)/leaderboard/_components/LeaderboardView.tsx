import Link from "next/link";

import type { ILeaderboardEntry } from "@/app/features/leaderboard/types";
import { rankEntries } from "@/app/features/leaderboard/utils/rankEntries";
import { getTierByMmr } from "@/app/features/match/utils/getTierByMmr";
import { getTierEmoji } from "@/app/features/match/utils/getTierEmoji";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface IProps {
  entries: ILeaderboardEntry[];
  currentUserId: string;
}

/**
 * 닉네임에서 Avatar fallback 첫 글자를 안전하게 추출한다.
 * UserMenu/ProfileView와 동일 패턴이지만 의존성을 만들지 않기 위해 로컬로 둔다.
 * @param nickname 사용자 닉네임 (null/빈 문자열 허용)
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
 * 리더보드 PR (MVP A-1): 리더보드 본체 (server component).
 *
 * - mmr 내림차순으로 이미 정렬된 entries를 rankEntries로 가공(동점은 같은 순위)해 렌더.
 * - 각 행은 Link로 감싸 프로필(/profile/[userId])로 이동. base-ui onClick 이슈 회피 위해 onClick 미사용.
 * - 본인 행은 ring + "나" 배지로 하이라이트.
 * - tier/mmr 배지는 ProfileView/결과 페이지와 동일하게 mmr → getTierByMmr 파생 (화면 간 정합성).
 */
export function LeaderboardView({ entries, currentUserId }: IProps) {
  // 표시 순위는 리스트 위치(index)와 분리 — 동점(MMR 동일)은 같은 순위(standard competition ranking).
  // entries는 getLeaderboard에서 MMR DESC로 이미 정렬됨. rankEntries가 rank를 붙여 한 번에 반환.
  const { ranked } = rankEntries({ entries });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-medium leading-tight">
          리더보드
        </h1>
        <p className="text-sm text-muted-foreground">
          MMR 순위 — 행을 누르면 프로필로 이동합니다.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              아직 랭킹 데이터가 없어요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranked.map((entry) => {
            const isMe = entry.id === currentUserId;

            // mmr은 컬럼 default 1000이라 null은 사실상 미발생(DB 검증: null 0건).
            // 만약 null이면 getLeaderboard가 맨 뒤로 정렬(nullsFirst:false)하고 여기선 1000(Bronze)으로 표시.
            const mmr = entry.mmr ?? 1000;

            const { tier } = getTierByMmr({ mmr });
            const { emoji } = getTierEmoji({ tier });
            const { initial } = getAvatarInitial({ nickname: entry.nickname });

            return (
              <li key={entry.id}>
                <Link
                  href={`/profile/${entry.id}`}
                  className={`flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                    isMe ? "bg-muted/40 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <span className="w-6 shrink-0 text-center font-heading text-base font-medium tabular-nums text-muted-foreground">
                    {entry.rank}
                  </span>

                  <Avatar>
                    {entry.avatar_url ? (
                      <AvatarImage
                        src={entry.avatar_url}
                        alt={entry.nickname ?? "익명"}
                      />
                    ) : null}
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>

                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {entry.nickname ?? "익명"}
                    </span>
                    {isMe ? (
                      <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">
                        나
                      </span>
                    ) : null}
                  </span>

                  <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                    {emoji ? <span aria-hidden="true">{emoji}</span> : null}
                    <span>{tier}</span>
                    <span className="text-muted-foreground">{mmr}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
