"use client";

import { Loader2 } from "lucide-react";

export default function WaitingForGameStart() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <Loader2
        className="size-8 animate-spin text-muted-foreground"
        role="status"
        aria-label="대전 시작 대기 중"
      />
      <p className="text-sm text-muted-foreground">
        대전 시작을 기다리는 중입니다...
      </p>
    </div>
  );
}
