"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IProps {
  userId: string;
  /**
   * "지금 정하기"를 눌렀을 때 부모(ProfileView)가 ProfileEditDialog를 열도록 알리는 콜백.
   * 자동 발화 다이얼로그 → 본 편집 Dialog로 자연스럽게 연결시키는 핸들.
   */
  onOpenEdit: () => void;
}

const STORAGE_KEY_PREFIX = "nicknameFallbackDismissed:";

/**
 * Step 3 프로필 PR (#18): 자동 생성 닉네임(Player_xxxxxxxx / Anon_xxxxxxxx) fallback 안내 다이얼로그.
 *
 * 발화 조건은 부모(ProfileView)에서 판정한다 — 본 컴포넌트는 mount 시 한 번 localStorage를 보고
 * dismiss 이력이 있으면 조용히 닫힌 상태로 유지한다.
 *
 * localStorage 가드:
 * - `typeof window === "undefined"`는 SSR 환경 보호 (Next.js App Router의 클라이언트 컴포넌트는
 *   기본적으로 hydration 전에 useEffect가 실행되지 않지만, 방어적으로 가드).
 * - try/catch는 사파리 시크릿 모드처럼 localStorage가 throw하는 환경 대비.
 *
 * React 19 Compiler 규칙: localStorage 접근은 useEffect/이벤트 핸들러 안에서만 — 컴포넌트 본문에서
 * 직접 호출하면 idempotency 위반.
 */
export function NicknameFallbackDialog({ userId, onOpenEdit }: IProps) {
  // useState lazy initializer로 mount 시 localStorage를 1회 읽고 초기 open 상태를 결정한다.
  // 이전엔 useState(false) + useEffect(setOpen(true)) 패턴이었으나, React 19의
  // react-hooks/set-state-in-effect 룰이 cascading render(2회 렌더)로 잡아낸다.
  // Dialog는 client-only portal이라 SSR HTML에 영향 없음 → hydration mismatch 위험 없음.
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      const dismissed = window.localStorage.getItem(
        `${STORAGE_KEY_PREFIX}${userId}`,
      );

      return !dismissed;
    } catch (error) {
      console.error(error);

      // localStorage 접근 실패 시에도 fallback Dialog는 열어서 사용자가 닉네임을 정할 기회를 보장.
      return true;
    }
  });

  /**
   * "나중에": localStorage에 dismiss 기록 + Dialog 닫기.
   * dismiss는 userId별로 분리 — 계정 전환 시 다시 발화하게 함.
   */
  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          `${STORAGE_KEY_PREFIX}${userId}`,
          new Date().toISOString(),
        );
      } catch (error) {
        console.error(error);
      }
    }

    setOpen(false);
  };

  /**
   * "지금 정하기": dismiss 기록은 남기지 않고 fallback Dialog만 닫은 뒤
   * 부모에게 편집 Dialog를 열라고 알린다. 사용자가 편집 도중 취소하면 다음 방문 시 다시 발화.
   */
  const handleOpenEdit = () => {
    setOpen(false);
    onOpenEdit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>닉네임을 설정하시겠어요?</DialogTitle>
          <DialogDescription>
            지금 보이는 닉네임은 자동으로 부여된 임시 이름이에요. 한 번 설정해
            두면 다른 사용자에게도 같은 이름으로 보여요.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss}>
            나중에
          </Button>
          <Button type="button" onClick={handleOpenEdit}>
            지금 정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
