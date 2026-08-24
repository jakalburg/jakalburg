import Cookies from "js-cookie";
import { AUTH_SESSION_MAX_AGE } from "@/config/auth.constant";

// ---------------------------------------------------------------------------
// Admin JWT store.
//
// The real NestJS server now guards every admin route (JwtAuthGuard +
// RolesGuard('admin')), so `realApi` must send a real admin access token. It
// lives in the `admin_access_token` cookie: set on a successful real login
// (see `admin-auth.ts`), read by the `real-axios` request interceptor, and
// cleared on logout or a 401/403 from the server.
// ---------------------------------------------------------------------------

export const ADMIN_TOKEN_COOKIE = "admin_access_token";

/** The current admin access token, or undefined when logged out. */
export function getAdminToken(): string | undefined {
  return Cookies.get(ADMIN_TOKEN_COOKIE);
}

/** Persist the admin access token (expiry mirrors the session max-age). */
export function setAdminToken(token: string): void {
  Cookies.set(ADMIN_TOKEN_COOKIE, token, {
    expires: AUTH_SESSION_MAX_AGE / (24 * 60 * 60),
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
}

/** Drop the admin access token (logout / auth failure). */
export function clearAdminToken(): void {
  Cookies.remove(ADMIN_TOKEN_COOKIE);
}
