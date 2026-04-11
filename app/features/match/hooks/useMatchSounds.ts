"use client";

import { useCallback, useEffect, useRef } from "react";

import { useSoundStore } from "@/app/shared/stores/useSoundStore";

type TSoundType =
  | "submit"
  | "opponentSubmit"
  | "warning"
  | "win"
  | "lose"
  | "draw";

const SOUND_PATH_MAP: Record<TSoundType, string> = {
  submit: "/sounds/submit.wav",
  opponentSubmit: "/sounds/opponent-submit.wav",
  warning: "/sounds/warning.wav",
  win: "/sounds/win.wav",
  lose: "/sounds/lose.wav",
  draw: "/sounds/draw.wav",
};

// 모듈 싱글톤 Audio pool (lazy init)
const audioPool: Partial<Record<TSoundType, HTMLAudioElement>> = {};

/**
 * 지정한 타입의 Audio 객체를 lazy 초기화한다.
 * @param params.type 사운드 타입
 * @return HTMLAudioElement 혹은 null (SSR 환경)
 */
const getAudio = ({
  type,
}: {
  type: TSoundType;
}): { audio: HTMLAudioElement | null } => {
  if (typeof window === "undefined") {
    return { audio: null };
  }

  const existing = audioPool[type];

  if (existing) {
    return { audio: existing };
  }

  const created = new Audio(SOUND_PATH_MAP[type]);

  audioPool[type] = created;

  return { audio: created };
};

/**
 * 대전 사운드 재생 훅. 음소거 상태면 재생하지 않는다.
 * playSound는 영구 안정 참조이므로 상위 useCallback 체인을 불필요하게 무효화하지 않는다.
 * @return playSound 함수를 담은 객체
 */
export const useMatchSounds = () => {
  const isMuted = useSoundStore((state) => {
    return state.isMuted;
  });
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const playSound = useCallback(({ type }: { type: TSoundType }) => {
    if (isMutedRef.current) {
      return;
    }

    const { audio } = getAudio({ type });

    if (!audio) {
      return;
    }

    audio.currentTime = 0;

    // 자동재생 정책으로 reject될 수 있음 — 조용히 실패 허용
    audio.play().catch((error) => {
      console.error(error);
    });
  }, []);

  return { playSound };
};
