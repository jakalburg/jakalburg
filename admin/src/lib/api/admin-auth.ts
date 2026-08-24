import axios from "axios";
import config from "@/config/config";
import { setAdminToken, clearAdminToken } from "./admin-token";

// ---------------------------------------------------------------------------
// Real admin authentication against the NestJS server.
//
// Uses a bare axios instance (NOT `realApi`) so the 401 -> /login redirect
// interceptor on `realApi` can't fire during a bad-credentials login attempt.
// On success the returned JWT is stored in the `admin_access_token` cookie and
// every subsequent `realApi` request attaches it as a Bearer token.
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export class AdminLoginError extends Error {}

/**
 * Log in with an admin email + password. Rejects non-admin accounts (only
 * `role === "admin"` may use this dashboard) and stores the JWT on success.
 */
export async function loginAdmin(
  email: string,
  password: string,
): Promise<AuthUser> {
  let data: AuthResponse;
  try {
    const res = await axios.post<AuthResponse>(
      `${config.api.baseURL}/auth/login-password`,
      { email: email.trim(), password },
      { headers: { "Content-Type": "application/json" }, timeout: config.api.timeout },
    );
    data = res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      // Surface the server's real reason ("Incorrect password", "No account
      // with that email", validation errors) instead of a generic string, so a
      // wrong-account/typo/autofill is obvious rather than a mystery.
      const body = err.response.data as { message?: string | string[] };
      const msg = Array.isArray(body?.message)
        ? body.message.join(", ")
        : body?.message;
      throw new AdminLoginError(msg || "Invalid email or password");
    }
    throw new AdminLoginError(
      "Could not reach the server. Check your connection and try again.",
    );
  }

  if (!data?.accessToken || data.user?.role !== "admin") {
    // A valid non-admin account must not gain admin access.
    clearAdminToken();
    throw new AdminLoginError("This account is not authorised for the admin.");
  }

  setAdminToken(data.accessToken);
  return data.user;
}
