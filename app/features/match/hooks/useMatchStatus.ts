"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/app/shared/lib/supabase/client";

interface IUseMatchStatusReturn {
  status: "waiting" | "ongoing" | "finished" | null;
  hostId: string | null;
  inviteToken: string | null;
  inviteExpiresAt: string | null;
  problemId: string | null;
  startTime: string | null;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  error: Error | null;
}

// matches row에서 동기화할 컬럼 목록. 초기 fetch / Realtime / 폴링 3곳에서 동일하게 쓰여 상수로 분리.
const SELECT_COLUMNS =
  "id, status, host_id, invite_token, invite_expires_at, problem_id, start_time";

/**
 * matches row의 실시간 상태를 구독하고 동기화하는 hook.
 * 초기 fetch + Realtime postgres_changes 구독 + 30초 폴링 fallback 3개 effect로 구성된다.
 *
 * 각 useEffect는 자체 `let isMounted` 변수로 가드를 분리한다.
 * 공유 ref를 쓰면 Strict Mode dev 환경의 mount→cleanup→mount 순서에서
 * 한 effect의 cleanup이 다른 effect의 가드를 false로 잘못 닫을 수 있다.
 *
 * @param matchId 대전 방 ID
 * @return status, hostId, inviteToken, inviteExpiresAt, problemId, startTime, isLoading, isRealtimeConnected, error
 */
export function useMatchStatus({
  matchId,
}: {
  matchId: string;
}): IUseMatchStatusReturn {
  const [status, setStatus] = useState<
    "waiting" | "ongoing" | "finished" | null
  >(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { client } = useMemo(() => {
    return createClient();
  }, []);

  // ── Effect 1: 초기 fetch ─────────────────────────────────────────
  // 마운트 시 1회 select. Realtime 구독 전에 현재 상태를 즉시 화면에 띄우기 위함.
  useEffect(() => {
    let isMounted = true;

    const fetchInitial = async () => {
      try {
        const { data, error: fetchError } = await client
          .from("matches")
          .select(SELECT_COLUMNS)
          .eq("id", matchId)
          .single();

        if (!isMounted) return;

        if (fetchError) {
          setError(new Error(fetchError.message));
          setIsLoading(false);
          return;
        }

        if (!data) {
          setIsLoading(false);
          return;
        }

        setStatus(data.status as "waiting" | "ongoing" | "finished");
        setHostId(data.host_id ?? null);
        setInviteToken(data.invite_token ?? null);
        setInviteExpiresAt(data.invite_expires_at ?? null);
        setProblemId(data.problem_id ?? null);
        setStartTime(data.start_time ?? null);
        setError(null);
      } catch (err) {
        console.error(err);

        if (!isMounted) return;

        setError(err instanceof Error ? err : new Error("알 수 없는 오류"));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [matchId, client]);

  // ── Effect 2: Realtime postgres_changes 구독 ───────────────────────
  // matches 테이블에서 이 matchId의 row가 UPDATE될 때 자동으로 알림 받음.
  // 송신자가 클라이언트가 아니라 Postgres 자체이므로 join API/submit API 등 어디서 변경됐든 모두 감지.
  // 채널 이름에 "match-status:" prefix를 두어 broadcast 채널(`match:`)과 분리 (디버깅 용이성).
  useEffect(() => {
    let isMounted = true;

    const channel = client
      .channel(`match-status:${matchId}`)
      .on(
        "postgres_changes",
        // filter 객체: event(어떤 변화) + schema/table(어디) + filter(어느 row).
        // filter는 PostgREST 문법(eq=equals). 이 매치의 row만 받기 위해 id=eq.${matchId} 사용.
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        ({ new: row }) => {
          if (!isMounted) return;

          // TODO: mcp__supabase__generate_typescript_types로 DB 타입 생성 후 교체
          const r = row as Record<string, unknown>;

          setStatus(r.status as "waiting" | "ongoing" | "finished");
          setHostId((r.host_id as string) ?? null);
          setInviteToken((r.invite_token as string) ?? null);
          setInviteExpiresAt((r.invite_expires_at as string) ?? null);
          setProblemId((r.problem_id as string) ?? null);
          setStartTime((r.start_time as string) ?? null);
          setError(null);
        },
      )
      // .subscribe()로 채널 합류 시작. status는 SUBSCRIBED / CHANNEL_ERROR / TIMED_OUT / CLOSED 중 하나.
      .subscribe((s) => {
        if (!isMounted) return;

        setIsRealtimeConnected(s === "SUBSCRIBED");
      });

    return () => {
      isMounted = false;
      client.removeChannel(channel);
      setIsRealtimeConnected(false);
    };
  }, [matchId, client]);

  // ── Effect 3: 폴링 fallback ────────────────────────────────────────
  // Realtime이 끊겨도(WebSocket 일시 단절 등) 30초마다 fetch해서 상태를 보정.
  // Realtime + 폴링 + 초기 fetch의 3중 redundancy로 매치 상태 동기화 보장.
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const { data, error: pollError } = await client
          .from("matches")
          .select(SELECT_COLUMNS)
          .eq("id", matchId)
          .single();

        if (!isMounted) return;

        if (pollError || !data) return;

        setStatus(data.status as "waiting" | "ongoing" | "finished");
        setHostId(data.host_id ?? null);
        setInviteToken(data.invite_token ?? null);
        setInviteExpiresAt(data.invite_expires_at ?? null);
        setProblemId(data.problem_id ?? null);
        setStartTime(data.start_time ?? null);
        setError(null);
      } catch (err) {
        console.error(err);
      }
    };

    const intervalId = setInterval(poll, 30_000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [matchId, client]);

  return {
    status,
    hostId,
    inviteToken,
    inviteExpiresAt,
    problemId,
    startTime,
    isLoading,
    isRealtimeConnected,
    error,
  };
}
