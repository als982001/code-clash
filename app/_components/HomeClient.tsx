"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";
import Link from "next/link";

import { MatchmakingDialog } from "@/app/features/match/components/MatchmakingDialog";
import { UserMenu } from "@/app/shared/components/UserMenu";
import { useAuth } from "@/app/shared/hooks/useAuth";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomeClient() {
  const { user, isLoading } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-end border-b border-border/50 bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <UserMenu />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <span className="text-sm">로딩중...</span>
          </div>
        ) : user ? (
          <SignedInView userId={user.id} />
        ) : (
          <SignedOutView />
        )}
      </main>
    </div>
  );
}

function SignedOutView() {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Code Clash</h1>
        <p className="text-sm text-muted-foreground">
          1:1 실시간 알고리즘 대전 플랫폼
        </p>
      </div>
      <Link
        href="/login"
        className={buttonVariants({ variant: "default", size: "lg" })}
      >
        로그인하고 시작하기
      </Link>
    </div>
  );
}

function SignedInView({ userId }: { userId: string }) {
  const [matchmakingOpen, setMatchmakingOpen] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          무엇을 하시겠어요?
        </h2>
        <p className="text-sm text-muted-foreground">
          매치 시작 또는 대시보드로 이동하세요.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={() => setMatchmakingOpen(true)}
          className="block text-left"
        >
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>매치 찾기</CardTitle>
              <CardDescription>
                비슷한 실력의 상대와 자동으로 대전하세요.
              </CardDescription>
            </CardHeader>
          </Card>
        </button>
        <Link href="/dashboard" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>대전하기</CardTitle>
              <CardDescription>
                친구를 초대해서 1:1 대전을 시작하세요.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/leaderboard" className="block">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle>리더보드</CardTitle>
              <CardDescription>MMR 순위를 확인하세요.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <MatchmakingDialog
        userId={userId}
        open={matchmakingOpen}
        onOpenChange={setMatchmakingOpen}
      />
    </div>
  );
}
