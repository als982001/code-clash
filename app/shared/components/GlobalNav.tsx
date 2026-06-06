"use client";

import { usePathname } from "next/navigation";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/dashboard", label: "대전하기" },
  { href: "/leaderboard", label: "리더보드" },
];

export function GlobalNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={buttonVariants({
              variant: isActive ? "secondary" : "ghost",
              size: "sm",
            })}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
