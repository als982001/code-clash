"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/app/shared/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function GuestStartButton() {
  const [isPending, setIsPending] = useState(false);
  const isMountedRef = useRef(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { client: supabase } = useMemo(() => {
    return createClient();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = async () => {
    if (isPending) return;

    setIsPending(true);

    try {
      const { error } = await supabase.auth.signInAnonymously();

      if (!isMountedRef.current) return;

      if (error) {
        console.error(error);
        toast.error("게스트 시작에 실패했습니다.");
        return;
      }

      // PR #7-C 도입 전 임시 처리: AuthListener가 없으므로 명시적으로 invalidate.
      // listener 도입 시 이 호출은 제거 예정.
      await queryClient.invalidateQueries({
        queryKey: ["auth", "session-and-profile"],
      });

      if (!isMountedRef.current) return;

      router.push("/");
    } catch (error) {
      if (!isMountedRef.current) return;

      console.error(error);
      toast.error("게스트 시작에 실패했습니다.");
    } finally {
      if (isMountedRef.current) {
        setIsPending(false);
      }
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className="w-full justify-center gap-2"
      disabled={isPending}
      onClick={handleClick}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      <span>게스트로 빠르게 시작하기</span>
    </Button>
  );
}
