import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MockUser } from "@/types";

interface AuthState {
  user: MockUser | null;
  signIn: (user: MockUser) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    {
      name: "vh-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
