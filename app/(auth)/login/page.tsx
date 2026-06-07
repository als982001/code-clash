"use client";

import { useEffect } from "react";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import OAuthButton from "@/app/(auth)/login/_components/OAuthButton";
import { sanitizeNext } from "@/app/(auth)/login/_utils/sanitizeNext";
import { useAuth } from "@/app/shared/hooks/useAuth";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const error = searchParams.get("error");

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    router.replace(sanitizeNext({ raw: next }).safeNext);
  }, [isLoading, user, next, router]);

  useEffect(() => {
    if (error !== "oauth_failed") return;

    toast.error("로그인에 실패했습니다. 다시 시도해주세요.");

    const params = new URLSearchParams(searchParams.toString());
    params.delete("error");
    const cleanQuery = params.toString();

    router.replace(`/login${cleanQuery ? `?${cleanQuery}` : ""}`);
  }, [error, router, searchParams]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-2 text-zinc-400">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <span className="text-sm">로딩중...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6 shadow-xl">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-zinc-50">Code Clash</h1>
        <p className="text-sm text-zinc-400">1:1 알고리즘 대전</p>
      </div>

      <div className="h-px w-full bg-zinc-800" aria-hidden="true" />

      <div className="space-y-3">
        <OAuthButton provider="google" nextPath={next} />
        <OAuthButton provider="github" nextPath={next} />
      </div>
    </div>
  );
}
