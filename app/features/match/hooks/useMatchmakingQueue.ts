"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/app/shared/lib/supabase/client";

interface IUseMatchmakingQueueParams {
  userId: string;
  // 대기 중일 때만 구독. join 응답이 matched=false일 때 true로 켠다.
  enabled: boolean;
  // 큐 row에 match_id가 채워지면 호출. 호출부에서 useCallback으로 안정화할 것
  // (deps에 들어가므로 매 렌더 새 함수면 재구독 사이클 발생).
  onMatched: (matchId: string) => void;
}

/**
 * 자기 matchmaking_queue row를 구독해 매칭 성사(match_id 채워짐)를 감지한다.
 * Realtime postgres_changes UPDATE + 5초 폴링 fallback 2개 effect로 구성.
 * 각 effect는 자체 `let isMounted` 가드로 분리한다(useMatchStatus와 동일 이유).
 *
 * @param userId 현재 유저 ID
 * @param enabled 대기 중일 때만 구독
 * @param onMatched match_id가 채워졌을 때 호출(useCallback 권장)
 * @return isRealtimeConnected
 */
export function useMatchmakingQueue({
  userId,
  enabled,
  onMatched,
}: IUseMatchmakingQueueParams): { isRealtimeConnected: boolean } {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const { client } = useMemo(() => {
    return createClient();
  }, []);

  // ── Effect 1: Realtime postgres_changes 구독 ───────────────────────
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const channel = client
      .channel(`matchmaking-queue:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matchmaking_queue",
          filter: `user_id=eq.${userId}`,
        },
        ({ new: row }) => {
          if (!isMounted) return;

          const r = row as Record<string, unknown>;
          const matchId = (r.match_id as string | null) ?? null;

          if (matchId) {
            onMatched(matchId);
          }
        },
      )
      .subscribe((s) => {
        if (!isMounted) return;

        setIsRealtimeConnected(s === "SUBSCRIBED");
      });

    return () => {
      isMounted = false;
      client.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [enabled, userId, client, onMatched]);

  // ── Effect 2: 폴링 fallback (5초) ──────────────────────────────────
  // 대기 중 빠른 반응이 필요하므로 useMatchStatus(30초)보다 짧게 둔다.
  // ⚠️ 한계(B-8): 폴링은 자기 큐 row 의 match_id 채워짐만 감지하고 재매칭을 트리거하지 않는다.
  // 두 유저가 거의 동시에 진입해 둘 다 waiting 으로 남는 동시 진입 데드락(RPC 주석 참고)은
  // 여기서 해소되지 않으며, 취소→재진입으로만 풀린다. 동접 극소 전제라 MVP 범위로 보류.
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const poll = async () => {
      try {
        const { data } = await client
          .from("matchmaking_queue")
          .select("match_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!isMounted) return;

        if (data?.match_id) {
          onMatched(data.match_id as string);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const intervalId = setInterval(poll, 5_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [enabled, userId, client, onMatched]);

  return { isRealtimeConnected };
}
