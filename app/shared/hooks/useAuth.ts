"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/app/shared/lib/supabase/client";
import { isAnonymousUser } from "@/app/shared/utils/isAnonymousUser";

const AUTH_QUERY_KEY = ["auth", "session-and-profile"] as const;

/**
 * 현재 인증 상태와 profiles row를 조회하는 React Query 훅.
 * 익명/정식 세션 모두 지원하며, handle_new_user 트리거가 silent하게 실패한 경우
 * profile 부재를 감지해 1회 upsert로 보강한다 (profiles self_insert RLS 정책 필수).
 * onAuthStateChange는 AuthListener(7-C 도입 예정)가 단독 처리하므로 본 훅은 React Query에만 의존한다.
 * @return user, profile, isLoading, isAnonymous
 */
export function useAuth() {
  const supabase = useMemo(() => {
    return createClient().client;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { user: null, profile: null };
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (existing) {
        return { user, profile: existing };
      }

      const { isAnonymous } = isAnonymousUser({ user });
      const fallbackNickname = isAnonymous
        ? `Anon_${user.id.slice(0, 8)}`
        : `Player_${user.id.slice(0, 8)}`;

      const { data: upserted } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, nickname: fallbackNickname },
          { onConflict: "id" },
        )
        .select()
        .single();

      return { user, profile: upserted };
    },
    staleTime: 1000 * 60,
  });

  const isAnonymous = data?.user
    ? isAnonymousUser({ user: data.user }).isAnonymous
    : false;

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading,
    isAnonymous,
  };
}
