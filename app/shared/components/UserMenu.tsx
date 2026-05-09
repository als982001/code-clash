"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AUTH_QUERY_KEY, useAuth } from "@/app/shared/hooks/useAuth";
import { isProtectedPath } from "@/app/shared/lib/auth/protectedPaths";
import { createClient } from "@/app/shared/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * 닉네임에서 Avatar fallback 첫 글자를 안전하게 추출한다.
 * @param nickname 사용자 닉네임 (null/빈 문자열 허용)
 * @return initial 항상 1글자 string ("?" fallback)
 */
function getAvatarInitial({ nickname }: { nickname: string | null }): {
  initial: string;
} {
  if (!nickname || nickname.length === 0) {
    return { initial: "?" };
  }

  return { initial: nickname.charAt(0).toUpperCase() };
}

export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, profile, isLoading } = useAuth();

  const { client: supabase } = useMemo(() => {
    return createClient();
  }, []);

  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true; // ⚠️ Strict Mode 대응 — 1차 cleanup → 2차 mount 시 ref가 false에 갇히는 버그 방지
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 비로그인: 단순 로그인 링크 (next 파라미터 없음 — 의사결정 (a))
  if (!isLoading && !user) {
    return (
      <Link
        href="/login"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        로그인
      </Link>
    );
  }

  const nickname = profile?.nickname ?? null;
  const avatarUrl = profile?.avatar_url ?? null;
  const { initial } = getAvatarInitial({ nickname });

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (!isMountedRef.current) return;

      if (error) {
        throw error;
      }
    } catch (error) {
      if (!isMountedRef.current) return;

      console.error(error);
      toast.error("로그아웃 중 문제가 발생했습니다.");
      setIsSigningOut(false);

      return;
    }

    // 즉시 UI 반영 (AuthListener의 SIGNED_OUT 이벤트와 중복이지만 race 방지)
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });

    const { isProtected } = isProtectedPath({ pathname: pathname ?? "/" });

    if (isProtected) {
      router.push("/");
    } else {
      router.refresh();
    }

    if (isMountedRef.current) {
      setIsSigningOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isLoading || isSigningOut}
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {isSigningOut ? (
          <span className="flex size-8 items-center justify-center">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          </span>
        ) : (
          <Avatar>
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={nickname ?? "user"} />
            ) : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>{nickname ?? "사용자"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          variant="destructive"
        >
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
