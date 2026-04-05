"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import type {
  IPlayerReadyPayload,
  IProgressUpdatePayload,
  IOpponentSubmittedPayload,
  IMatchFinishedPayload,
  TMatchEvent,
} from "@/app/features/match/types";
import { createClient } from "@/app/shared/lib/supabase/client";

interface IMatchRealtimeCallbacks {
  onPlayerReady?: ({ payload }: { payload: IPlayerReadyPayload }) => void;
  onProgressUpdate?: ({ payload }: { payload: IProgressUpdatePayload }) => void;
  onOpponentSubmitted?: ({
    payload,
  }: {
    payload: IOpponentSubmittedPayload;
  }) => void;
  onMatchFinished?: ({ payload }: { payload: IMatchFinishedPayload }) => void;
}

/**
 * Supabase Realtime Broadcast 채널을 구성하고, 이벤트 수신/송신 기능을 제공한다.
 * @param matchId 대전 방 ID
 * @param callbacks 이벤트별 콜백 함수
 * @return broadcast 함수 (이벤트 송신용), isSubscribed (채널 구독 완료 여부)
 */
export function useMatchRealtime({
  matchId,
  callbacks,
}: {
  matchId: string;
  callbacks: IMatchRealtimeCallbacks;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    setIsSubscribed(false);

    const { client } = createClient();

    const channel = client.channel(`match:${matchId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "PLAYER_READY" }, ({ payload }) => {
        callbacksRef.current.onPlayerReady?.({
          payload: payload as IPlayerReadyPayload,
        });
      })
      .on("broadcast", { event: "PROGRESS_UPDATE" }, ({ payload }) => {
        callbacksRef.current.onProgressUpdate?.({
          payload: payload as IProgressUpdatePayload,
        });
      })
      .on("broadcast", { event: "OPPONENT_SUBMITTED" }, ({ payload }) => {
        callbacksRef.current.onOpponentSubmitted?.({
          payload: payload as IOpponentSubmittedPayload,
        });
      })
      .on("broadcast", { event: "MATCH_FINISHED" }, ({ payload }) => {
        callbacksRef.current.onMatchFinished?.({
          payload: payload as IMatchFinishedPayload,
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
        }
      });

    channelRef.current = channel;

    return () => {
      client.removeChannel(channel);
      channelRef.current = null;
      setIsSubscribed(false);
    };
  }, [matchId]);

  const broadcast = useCallback(
    async ({
      event,
      payload,
    }: {
      event: TMatchEvent;
      payload: Record<string, unknown>;
    }) => {
      if (!channelRef.current) {
        return;
      }

      await channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
    },
    [],
  );

  return { broadcast, isSubscribed };
}
