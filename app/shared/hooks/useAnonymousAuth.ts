"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { createClient } from "@/app/shared/lib/supabase/client";

/**
 * Supabase 익명 로그인을 자동으로 수행하고 userId를 반환한다.
 * 기존 세션이 있으면 재사용하고, 없으면 signInAnonymously()를 호출한다.
 * @return userId (인증된 유저 ID) 및 로딩 상태
 */
export function useAnonymousAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { client } = createClient();

    const initAuth = async () => {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (user) {
        setUserId(user.id);
        setIsLoading(false);
        return;
      }

      const { data, error } = await client.auth.signInAnonymously();

      if (error) {
        console.error(error);
        toast.error("인증에 실패했습니다. 새로고침 후 다시 시도해주세요.");
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        toast.error("인증에 실패했습니다. 새로고침 후 다시 시도해주세요.");
        setIsLoading(false);
        return;
      }

      setUserId(data.user.id);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return { userId, isLoading };
}
