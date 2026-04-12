"use client";

import { useEffect, useState } from "react";

import { Volume2, VolumeX } from "lucide-react";

import { useSoundStore } from "@/app/shared/stores/useSoundStore";

/**
 * 사운드 음소거를 토글하는 아이콘 버튼.
 * Zustand store와 연결되어 localStorage에 상태가 영속화된다.
 * SSR 환경 대응을 위해 mount 이후에만 실제 상태로 렌더한다.
 */
export default function SoundToggle() {
  const [hydrated, setHydrated] = useState(false);
  const isMuted = useSoundStore((state) => {
    return state.isMuted;
  });
  const toggleMute = useSoundStore((state) => {
    return state.toggleMute;
  });

  useEffect(() => {
    useSoundStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const showMuted = hydrated && isMuted;

  return (
    <button
      type="button"
      onClick={toggleMute}
      aria-label={showMuted ? "소리 켜기" : "소리 끄기"}
      className="text-muted-foreground hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 rounded p-1.5 transition-colors focus-visible:outline-none"
    >
      {showMuted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}
