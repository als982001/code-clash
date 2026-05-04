"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { createClient } from "@/app/shared/lib/supabase/client";

export const AUTH_QUERY_KEY = ["auth", "session-and-profile"] as const;

/**
 * 현재 인증 상태와 profiles row를 조회하는 React Query 훅.
 * handle_new_user 트리거가 silent하게 실패한 경우 profile 부재를 감지해 1회 upsert로 보강한다 (profiles self_insert RLS 정책 필수).
 * onAuthStateChange는 AuthListener(7-C 도입 예정)가 단독 처리하므로 본 훅은 React Query에만 의존한다.
 * @return user, profile, isLoading
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
        error: authError,
      } = await supabase.auth.getUser();

      // AuthSessionMissingError는 정상 흐름(비로그인) → throw 안 함.
      // 그 외 인증 에러만 throw → retry 정책이 실효적으로 동작.
      if (authError && authError.name !== "AuthSessionMissingError") {
        throw authError;
      }

      if (!user) {
        return { user: null, profile: null };
      }

      const { data: existing, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (existing) {
        return { user, profile: existing };
      }

      const fallbackNickname = `Player_${user.id.slice(0, 8)}`;

      const { data: upserted, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, nickname: fallbackNickname },
          { onConflict: "id" },
        )
        .select()
        .single();

      if (upsertError) {
        throw upsertError;
      }

      return { user, profile: upserted };
    },
    staleTime: 1000 * 60,
    retry: (failureCount, error) => {
      // 인증/RLS 거부(4xx)는 즉시 실패 처리. 네트워크/5xx만 1회 재시도.
      const status = (error as { status?: number })?.status;

      if (status !== undefined && status >= 400 && status < 500) {
        return false;
      }

      return failureCount < 1;
    },
  });

  return {
    user: data?.user ?? null,
    profile: data?.profile ?? null,
    isLoading,
  };
}
