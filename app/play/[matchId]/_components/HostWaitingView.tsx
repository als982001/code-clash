"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { isInviteExpired } from "@/app/features/match/utils/isInviteExpired";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface IHostWaitingViewProps {
  inviteToken: string | null;
  expiresAt: string | null;
  isRealtimeConnected: boolean;
}

export default function HostWaitingView({
  inviteToken,
  expiresAt,
  isRealtimeConnected,
}: IHostWaitingViewProps) {
  const [isCopied, setIsCopied] = useState(false);

  const isMountedRef = useRef(true);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // useMemo로 감싸 React 19 Compiler idempotency 룰 안전 확보 (Date.now()를 내부 호출하므로)
  const { expired: isExpired } = useMemo(() => {
    return isInviteExpired({ isoString: expiresAt });
  }, [expiresAt]);

  const inviteUrl = useMemo(() => {
    return typeof window !== "undefined" && inviteToken
      ? `${window.location.origin}/invite/${inviteToken}`
      : "";
  }, [inviteToken]);

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);

      if (!isMountedRef.current) return;

      setIsCopied(true);

      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsCopied(false);
      }, 1500);
    } catch (error) {
      console.error(error);

      if (!isMountedRef.current) return;

      toast.error("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>친구 입장 대기 중...</CardTitle>
          <CardDescription>
            초대 링크를 친구에게 공유하세요. 친구가 입장하면 자동으로
            시작됩니다.
          </CardDescription>
        </CardHeader>
      </Card>

      {isExpired ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            초대 링크가 만료됐습니다. 대시보드에서 다시 만들어주세요.
          </p>
          <Link href="/dashboard" className={buttonVariants({})}>
            대시보드로 이동
          </Link>
        </div>
      ) : (
        <div className="flex w-full max-w-md items-center gap-2">
          <Input
            readOnly
            value={inviteUrl}
            aria-label="초대 링크"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 shrink-0"
          >
            {isCopied ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                <span>복사됨</span>
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden="true" />
                <span>링크 복사</span>
              </>
            )}
          </Button>
        </div>
      )}

      {!isExpired && !isRealtimeConnected && (
        <p className="text-xs text-muted-foreground">
          실시간 연결이 일시적으로 끊겼습니다. 폴링으로 동기화 중...
        </p>
      )}

      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "outline" })}
      >
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
