"use client";

import { createContext, useContext } from "react";

// ---------------------------------------------------------------------------
// Mock auth shim — drop-in stand-in for `next-auth/react` in the UI-only build.
//
// The real authentication backend is intentionally NOT migrated. This module
// exposes the same surface the admin UI consumed from `next-auth/react`
// (SessionProvider / useSession / getSession / signIn / signOut) but returns a
// static, always-authenticated admin session so every admin screen renders.
//
// To wire the real backend later: delete this file and point the imports back
// at `next-auth/react`.
// ---------------------------------------------------------------------------

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface MockSession {
  user: MockUser;
  accessToken: string;
  expires: string;
}

const MOCK_SESSION: MockSession = {
  user: {
    id: "1",
    name: "Admin User",
    email: "admin@kaybykhushie.com",
    role: "admin",
    firstName: "Admin",
    lastName: "User",
  },
  accessToken: "mock-access-token",
  expires: "2999-12-31T23:59:59.999Z",
};

const SessionContext = createContext<MockSession>(MOCK_SESSION);

export function SessionProvider({
  children,
}: {
  children: React.ReactNode;
  // Accept and ignore next-auth SessionProvider props for drop-in compatibility.
  [key: string]: unknown;
}) {
  return (
    <SessionContext.Provider value={MOCK_SESSION}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const data = useContext(SessionContext);
  return {
    data,
    status: "authenticated" as const,
    update: async () => data,
  };
}

export async function getSession(): Promise<MockSession> {
  return MOCK_SESSION;
}

export async function signIn(
  _provider?: string,
  _options?: Record<string, unknown>,
): Promise<{ ok: boolean; error: string | null; status: number; url: string | null }> {
  // No real credential check in the UI-only build — always succeeds.
  return { ok: true, error: null, status: 200, url: null };
}

export async function signOut(options?: {
  callbackUrl?: string;
  redirect?: boolean;
}): Promise<{ url: string }> {
  const target = options?.callbackUrl || "/login";
  if (typeof window !== "undefined" && options?.redirect !== false) {
    window.location.assign(target);
  }
  return { url: target };
}
