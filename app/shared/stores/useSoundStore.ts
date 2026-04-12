import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ISoundStore {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (params: { muted: boolean }) => void;
}

/**
 * 사운드 음소거 상태를 전역으로 관리한다.
 * localStorage에 "code-clash-sound" 키로 영속화한다.
 */
export const useSoundStore = create<ISoundStore>()(
  persist(
    (set) => {
      return {
        isMuted: false,
        toggleMute: () => {
          return set((state) => {
            return { isMuted: !state.isMuted };
          });
        },
        setMuted: ({ muted }) => {
          return set({ isMuted: muted });
        },
      };
    },
    {
      name: "code-clash-sound",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => {
              return null;
            },
            setItem: () => {
              return undefined;
            },
            removeItem: () => {
              return undefined;
            },
          };
        }

        return localStorage;
      }),
      skipHydration: true,
    },
  ),
);
