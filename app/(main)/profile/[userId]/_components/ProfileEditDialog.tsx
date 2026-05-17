"use client";

import { useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  IProfile,
  IProfileUpdatePayload,
} from "@/app/features/profile/types";
import { validateNickname } from "@/app/features/profile/utils/validateNickname";
import { AUTH_QUERY_KEY } from "@/app/shared/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IProps {
  profile: IProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BIO_MAX_LENGTH = 200;

/**
 * Step 3 프로필 PR (#18): 본인 프로필 편집 Dialog.
 *
 * 책임:
 * - nickname / bio 폼 (validateNickname 클라이언트 검증으로 submit disable)
 * - `PATCH /api/profile/me` 호출
 * - 성공 시 AUTH_QUERY_KEY invalidate + router.refresh() + Dialog close + sonner toast
 * - 409(닉네임 중복) → Input 아래 inline error
 * - 기타 에러 → toast.error
 *
 * 컨벤션:
 * - async + setState 가드: isMountedRef 패턴 + Strict Mode reset.
 * - 부모에서 open/onOpenChange를 컨트롤 → ProfileView가 NicknameFallbackDialog에서도 동일 Dialog를
 *   열 수 있게 한다 (트리거를 한 곳으로 통일).
 */
export function ProfileEditDialog({ profile, open, onOpenChange }: IProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // 폼 상태. Dialog가 열릴 때마다 최신 profile로 reset.
  const [nickname, setNickname] = useState(profile.nickname);
  const [bio, setBio] = useState(profile.bio ?? "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true; // Strict Mode 1차 cleanup → 2차 mount 시 ref 재설정.

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Dialog가 다시 열리면 폼 상태를 최신 profile 값으로 sync.
  // open이 false → true로 전환될 때만 reset해서, 사용자가 입력 중인 값이 의도치 않게 날아가지 않게 한다.
  useEffect(() => {
    if (open) {
      setNickname(profile.nickname);
      setBio(profile.bio ?? "");
      setServerError(null);
    }
  }, [open, profile.nickname, profile.bio]);

  const trimmedNickname = nickname.trim();
  const { ok: nicknameOk, error: nicknameError } = validateNickname({
    value: trimmedNickname,
  });

  const trimmedBio = bio.trim();
  const bioOverLength = trimmedBio.length > BIO_MAX_LENGTH;

  // 변경된 필드만 payload에 담는다. 둘 다 동일하면 disable로 막아 호출 자체를 안 한다.
  const nicknameChanged = trimmedNickname !== profile.nickname;
  const normalizedBio = trimmedBio.length === 0 ? null : trimmedBio;
  const bioChanged = normalizedBio !== (profile.bio ?? null);
  const hasChanges = nicknameChanged || bioChanged;

  const canSubmit = !isSubmitting && nicknameOk && !bioOverLength && hasChanges;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    setIsSubmitting(true);
    setServerError(null);

    const payload: IProfileUpdatePayload = {};

    if (nicknameChanged) {
      payload.nickname = trimmedNickname;
    }

    if (bioChanged) {
      payload.bio = normalizedBio;
    }

    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!isMountedRef.current) return;

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!isMountedRef.current) return;

        if (res.status === 409) {
          // 닉네임 중복: Input 아래 inline 에러로 표시 (Dialog는 닫지 않음).
          setServerError(body?.error ?? "이미 사용 중인 닉네임입니다.");
        } else {
          toast.error(body?.error ?? "프로필 저장에 실패했습니다.");
        }

        return;
      }

      // 성공: useAuth 갱신 → 헤더(UserMenu)/페이지 동시 동기화 + Dialog 닫기.
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.refresh();
      toast.success("프로필을 저장했어요");
      onOpenChange(false);
    } catch (error) {
      console.error(error);

      if (!isMountedRef.current) return;

      toast.error("저장 중 문제가 발생했어요");
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로필 편집</DialogTitle>
          <DialogDescription>
            닉네임과 한 줄 소개를 변경할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-edit-nickname">닉네임</Label>
            <Input
              id="profile-edit-nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (serverError) setServerError(null);
              }}
              disabled={isSubmitting}
              maxLength={20}
              aria-invalid={
                (!nicknameOk && nickname.length > 0) || Boolean(serverError)
              }
              autoComplete="off"
            />
            {nickname.length > 0 && !nicknameOk ? (
              <p className="text-xs text-destructive">{nicknameError}</p>
            ) : null}
            {serverError ? (
              <p className="text-xs text-destructive">{serverError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-edit-bio">한 줄 소개 (선택)</Label>
            <Input
              id="profile-edit-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSubmitting}
              maxLength={BIO_MAX_LENGTH + 1}
              placeholder="200자 이내"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {trimmedBio.length} / {BIO_MAX_LENGTH}자
            </p>
            {bioOverLength ? (
              <p className="text-xs text-destructive">
                한 줄 소개는 200자 이내로 입력해주세요.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={!canSubmit} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              <span>저장</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
