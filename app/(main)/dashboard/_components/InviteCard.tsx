"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  IInviteMatch,
  IInviteResponse,
} from "@/app/features/match/types/invite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function InviteCard() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [inviteData, setInviteData] = useState<IInviteMatch | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleCreate = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setInviteData(null);

    try {
      const res = await fetch("/api/match/invite", { method: "POST" });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!isMountedRef.current) return;

        toast.error(body?.error ?? "초대 링크 생성에 실패했습니다.");
        return;
      }

      const { data }: IInviteResponse = await res.json();

      if (!isMountedRef.current) return;

      setInviteData(data);
      setDialogOpen(true);
    } catch (error) {
      console.error(error);

      if (!isMountedRef.current) return;

      toast.error("초대 링크 생성 중 오류가 발생했습니다.");
    } finally {
      if (isMountedRef.current) setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteData) return;

    try {
      await navigator.clipboard.writeText(inviteData.inviteUrl);

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

  const handleEnter = () => {
    if (!inviteData) return;

    router.push(`/play/${inviteData.matchId}`);
  };

  const expiresAtLabel = inviteData
    ? new Date(inviteData.inviteExpiresAt).toLocaleString("ko-KR")
    : "";

  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>친구 초대해서 대전하기</CardTitle>
          <CardDescription>
            초대 링크를 만들어 친구에게 공유하세요. 30분 안에 입장해야 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full justify-center gap-2"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>초대 링크 만들기</span>
          </Button>
        </CardContent>
      </Card>

      <Card aria-disabled="true" className="cursor-not-allowed opacity-60">
        <CardHeader>
          <CardTitle>자동 매칭</CardTitle>
          <CardDescription>준비중 — 다음 PR에서 제공됩니다.</CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>초대 링크가 생성되었습니다</DialogTitle>
            <DialogDescription>
              30분 안에 친구가 입장해야 합니다 — 만료: {expiresAtLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteData?.inviteUrl ?? ""}
              aria-label="초대 링크"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
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

          <DialogFooter>
            <Button type="button" onClick={handleEnter}>
              방으로 입장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
