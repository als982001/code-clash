"use client";

import { useEffect, useMemo } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { AUTH_QUERY_KEY } from "@/app/shared/hooks/useAuth";
import { createClient } from "@/app/shared/lib/supabase/client";

// user identity가 실제로 바뀌는 이벤트만 invalidate.
// TOKEN_REFRESHED는 쿠키만 갱신되고 user 식별은 그대로 → invalidate 시 무한 루프 우려가 있어 제외.
// INITIAL_SESSION / PASSWORD_RECOVERY / MFA_CHALLENGE_VERIFIED 등 그 외 이벤트도 본 PR 범위에서는 무시.
const INVALIDATE_EVENTS = ["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"] as const;

type InvalidateEvent = (typeof INVALIDATE_EVENTS)[number];

/**
 * Supabase `onAuthStateChange`를 전역에서 단일 구독하고
 * 인증 식별 변화 이벤트에서 React Query `AUTH_QUERY_KEY`를 무효화한다.
 * 렌더 결과는 없으며 QueryProvider 내부에 한 번만 마운트한다.
 */
export function AuthListener() {
  const queryClient = useQueryClient();

  const { client: supabase } = useMemo(() => {
    return createClient();
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!INVALIDATE_EVENTS.includes(event as InvalidateEvent)) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  return null;
}
