import type {
  ILeaderboardEntry,
  IRankedEntry,
} from "@/app/features/leaderboard/types";

/**
 * MMR 내림차순으로 이미 정렬된 entries에 standard competition ranking(1-2-2-2-5)을 부여해 반환한다.
 * 동점(MMR 동일)은 같은 순위를 갖고, 다음 순위는 동점 인원수만큼 건너뛴다.
 * 예: MMR [1500, 1000, 1000, 1000, 800] → rank [1, 2, 2, 2, 5]
 *
 * "리스트 표시 순서"(정렬은 getLeaderboard가 MMR DESC → created_at ASC로 결정)와
 * "표시 순위 숫자"를 분리하기 위한 가공 단계. 한 번의 순회로 rank를 붙인 배열을 반환해
 * 중간 배열(mmrs)이나 인덱스 lookup 없이 렌더에서 바로 사용할 수 있게 한다.
 *
 * @param entries getLeaderboard에서 MMR DESC로 이미 정렬된 배열
 * @return ranked 각 entry에 rank가 부여된 배열 (entries와 같은 순서/길이)
 */
export function rankEntries({ entries }: { entries: ILeaderboardEntry[] }): {
  ranked: IRankedEntry[];
} {
  const ranked: IRankedEntry[] = [];

  let currentRank = 0;
  let prevMmr: number | null = null;

  entries.forEach((entry, index) => {
    const mmr = entry.mmr ?? 1000;

    if (mmr !== prevMmr) {
      currentRank = index + 1;
      prevMmr = mmr;
    }

    ranked.push({ ...entry, rank: currentRank });
  });

  return { ranked };
}
