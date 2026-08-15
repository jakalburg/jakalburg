import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface RecentlyViewedState {
  ids: string[];
  push: (id: string) => void;
  clear: () => void;
}

const MAX = 8;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      ids: [],
      push: (id) => {
        const next = [id, ...get().ids.filter((x) => x !== id)].slice(0, MAX);
        set({ ids: next });
      },
      clear: () => set({ ids: [] }),
    }),
    {
      name: "vh-recently-viewed",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({ ids: s.ids }),
    },
  ),
);
