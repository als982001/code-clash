import { UserMenu } from "@/app/shared/components/UserMenu";

import InviteCard from "./_components/InviteCard";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* (main) 글로벌 헤더 PR 도입 시 본 임시 헤더 제거 필요 */}
      <header className="flex w-full items-center justify-end border-b border-border/50 px-6 py-4">
        <UserMenu />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="w-full max-w-3xl space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            친구를 초대해서 1:1 대전을 시작하세요.
          </p>
        </div>

        <InviteCard />
      </main>
    </div>
  );
}
