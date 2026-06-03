import Link from "next/link";

import { UserMenu } from "@/app/shared/components/UserMenu";
import { buttonVariants } from "@/components/ui/button-variants";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          href="/leaderboard"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          리더보드
        </Link>
        <UserMenu />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
