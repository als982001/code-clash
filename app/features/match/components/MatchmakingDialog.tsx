"use client";

import { useCallback, useEffect, useRef } from "react";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useMatchmakingQueue } from "@/app/features/match/hooks/useMatchmakingQueue";
import type { IMatchmakingJoinResponse } from "@/app/features/match/types/matchmaking";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IMatchmakingDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 자동 매칭 대기 모달. 홈/대시보드 placeholder 2곳에서 재사용.
 * open되면 join 호출 → matched=true면 즉시 /play, false면 대기(Realtime 감지).
 * 취소/닫기/페이지 이탈 시 leave로 큐 정리.
 */
export function MatchmakingDialog({
  userId,
  open,
  onOpenChange,
}: IMatchmakingDialogProps) {
  const router = useRouter();

  // 이미 /play로 이동했는지 — join 응답과 Realtime 감지가 중복 push하지 않도록 가드.
  const hasNavigatedRef = useRef(false);

  // /play로 이동. 중복 호출 방지.
  const navigateToMatch = useCallback(
    (matchId: string) => {
      if (hasNavigatedRef.current) return;

      hasNavigatedRef.current = true;
      router.push(`/play/${matchId}`);
    },
    [router],
  );

  // best-effort 큐 정리. 페이지 이탈에도 도달하도록 sendBeacon 우선.
  const leaveQueue = useCallback(() => {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/match/matchmaking/leave");
    } else {
      fetch("/api/match/matchmaking/leave", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  // 모달이 열려 있는 동안만 큐 구독. (open이 닫히면 enabled=false로 구독 해제)
  useMatchmakingQueue({
    userId,
    enabled: open,
    onMatched: navigateToMatch,
  });

  // ── 모달 open 시 join 호출 ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    hasNavigatedRef.current = false;

    const join = async () => {
      try {
        const res = await fetch("/api/match/matchmaking/join", {
          method: "POST",
        });

        if (!isMounted) return;

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };

          if (!isMounted) return;

          toast.error(body?.error ?? "매칭에 실패했습니다.");
          onOpenChange(false);
          return;
        }

        const { data }: IMatchmakingJoinResponse = await res.json();

        if (!isMounted) return;

        if (data.matched) {
          navigateToMatch(data.matchId);
        }
        // matched=false면 대기 — useMatchmakingQueue가 match_id를 감지.
      } catch (error) {
        console.error(error);

        if (!isMounted) return;

        toast.error("매칭 중 오류가 발생했습니다.");
        onOpenChange(false);
      }
    };

    join();

    return () => {
      isMounted = false;
    };
  }, [open, navigateToMatch, onOpenChange]);

  // ── 페이지 이탈 시 큐 정리 ─────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const handleBeforeUnload = () => {
      if (!hasNavigatedRef.current) leaveQueue();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [open, leaveQueue]);

  // 취소: 매칭 성사 전이면 큐 정리 + 모달 닫기.
  const handleCancel = useCallback(() => {
    if (!hasNavigatedRef.current) leaveQueue();

    onOpenChange(false);
  }, [leaveQueue, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleCancel();
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>자동 매칭</DialogTitle>
          <DialogDescription>
            비슷한 실력의 상대를 찾고 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2
            className="size-8 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-sm text-muted-foreground">매칭 중...</span>
        </div>

        <Button type="button" variant="outline" onClick={handleCancel}>
          취소
        </Button>
      </DialogContent>
    </Dialog>
  );
}
