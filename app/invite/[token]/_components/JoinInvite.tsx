"use client";

import { useEffect, useRef, useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/app/shared/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";

interface IJoinInviteProps {
  matchId: string;
  hostId: string | null;
  token: string;
}

export default function JoinInvite({
  matchId,
  hostId,
  token,
}: IJoinInviteProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    // Strict Mode 대응: 1차 cleanup → 2차 mount 시 ref가 false에 갇히는 버그 방지를 위해 본문에서 true로 reset
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (!hostId) return;
    if (user.id !== hostId) return;

    router.replace(`/play/${matchId}`);
  }, [isLoading, user, hostId, matchId, router]);

  const handleJoin = async () => {
    if (isJoining) return;
    if (hostId && user?.id === hostId) return;

    setIsJoining(true);

    try {
      const res = await fetch(`/api/match/${matchId}/join`, {
        method: "POST",
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!isMountedRef.current) return;

        toast.error(body?.error ?? "입장에 실패했습니다.");
        return;
      }

      // 성공 시 navigate 직전까지 disabled 스피너 유지 (의도된 UX); finally에서 unmount 가드와 함께 false 처리
      router.push(`/play/${matchId}`);
    } catch (error) {
      console.error(error);

      if (!isMountedRef.current) return;

      toast.error("입장 중 오류가 발생했습니다.");
    } finally {
      if (isMountedRef.current) setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground"
        role="status"
        aria-label="로딩 중"
      >
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!user) {
    // /login 페이지의 sanitizeNext가 same-origin 가드를 책임지지만, URL 파라미터 안전 인코딩을 위해 encodeURIComponent 적용
    const next = encodeURIComponent(`/invite/${token}`);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
        <h1 className="text-2xl font-semibold tracking-tight">
          친구가 초대했습니다
        </h1>
        <p className="text-sm text-muted-foreground">
          로그인 후 대전에 입장할 수 있습니다.
        </p>
        <Link
          href={`/login?next=${next}`}
          className={buttonVariants({ size: "lg" })}
        >
          로그인하고 입장하기
        </Link>
      </div>
    );
  }

  if (hostId && user.id === hostId) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">
        친구가 초대했습니다
      </h1>
      <p className="text-sm text-muted-foreground">대전을 시작할까요?</p>
      <Button
        type="button"
        size="lg"
        onClick={handleJoin}
        disabled={isJoining}
        className="gap-2"
      >
        {isJoining ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        <span>입장하기</span>
      </Button>
    </div>
  );
}
