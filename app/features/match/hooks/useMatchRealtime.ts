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
  // channel 인스턴스 보관 (broadcast 송신 시 참조).
  const channelRef = useRef<RealtimeChannel | null>(null);
  // 콜백 ref 패턴: 콜백을 ref에 두면 effect 의존성에서 빠질 수 있어 채널 재구독을 피할 수 있다.
  const callbacksRef = useRef(callbacks);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 매 렌더마다 최신 콜백을 ref에 동기화 (의존성 배열 없음 = 매 렌더 실행).
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  useEffect(() => {
    const { client } = createClient();

    // broadcast 채널. self:false → 내가 보낸 메시지는 나에게 echo되지 않음 (자기 메시지 무시 로직 단순화).
    const channel = client.channel(`match:${matchId}`, {
      config: { broadcast: { self: false } },
    });

    // .on(type, filter, callback) 패턴으로 이벤트별 핸들러 등록 (addEventListener의 강화 버전).
    // 4개 이벤트: PLAYER_READY / PROGRESS_UPDATE / OPPONENT_SUBMITTED / MATCH_FINISHED.
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
        // 외부 시스템(채널)의 모든 상태 변화를 단일 callback에서 반영.
        // SUBSCRIBED → true, CLOSED / CHANNEL_ERROR / TIMED_OUT → false.
        // effect body 또는 cleanup에서 직접 setState하지 않는 이유:
        // React 19+가 effect body 내 동기 setState를 cascading render로 보고 경고하기 때문.
        setIsSubscribed(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    // cleanup: 채널 제거 시 등록된 4개 핸들러도 한꺼번에 해제 (개별 off API 없음).
    return () => {
      client.removeChannel(channel);
      channelRef.current = null;
      setIsSubscribed(false);
    };
  }, [matchId]);

  // 외부에서 호출하는 송신 헬퍼. channelRef가 비어있으면 (구독 전/cleanup 후) no-op.
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
