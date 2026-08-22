"use client";

import { SessionProvider as MockSessionProvider } from "@/lib/mock-auth";

// UI-only build: backed by the local mock-auth shim instead of next-auth.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <MockSessionProvider>{children}</MockSessionProvider>;
}
