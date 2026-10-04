// Minimal fetch wrapper for the Jakalburg NestJS backend. No extra HTTP
// dependency — plain fetch + a typed error. The JWT is the canonical source of
// truth here (localStorage key "auth_token"); the redux auth slice reads it
// through getToken()/setToken()/clearToken() so serialization stays consistent.

const TOKEN_KEY = "auth_token";
// Where the redux auth slice persists the user object. Owned here alongside the
// token so a forced sign-out can clear the whole client session in one place;
// the slice imports this key so the two never drift apart.
export const AUTH_USER_KEY = "auth_user";

// Strip a trailing slash and a trailing "/api" so endpoint paths (which already
// start with "/api/...") never double up (e.g. ".../api/api/auth/login").
const RAW_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "").replace(/\/api$/, "");

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Cookie the maintenance middleware parks a verified preview token in. */
const PREVIEW_COOKIE = "jb_preview";

/**
 * The maintenance preview token, if this browser has one.
 *
 * While maintenance is on the API answers 503 for everything, so an admin
 * previewing the site needs every request to carry the token — otherwise they
 * get the page shell and no data. The token is only ever a claim: the server
 * verifies it against a stored hash on each request, so sending a made-up one
 * achieves nothing.
 */
function getPreviewToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${PREVIEW_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore write failures (quota / private mode) */
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Fully sign the user out of the browser and bounce to the sign-in screen.
 *
 * Called when an authenticated request comes back 401 — the stored JWT is no
 * longer accepted, so rather than let the user keep hitting the same wall we
 * drop the whole session (token + persisted user) and send them to /login. The
 * hard navigation also resets the redux store, which rehydrates from the (now
 * cleared) storage as logged-out.
 */
function forceSignOut(): void {
  if (typeof window === "undefined") return;
  clearToken();
  try {
    window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    /* ignore */
  }
  const { pathname, search } = window.location;
  // Don't loop when we're already on the sign-in screen.
  if (!pathname.startsWith("/login")) {
    const redirect = encodeURIComponent(pathname + search);
    window.location.assign(`/login?redirect=${redirect}`);
  }
}

export class ApiError extends Error {
  status: number;
  requestId?: string;
  /**
   * The parsed error body, when the server sent one.
   *
   * Some failures carry more than a message — a captured payment that couldn't
   * be turned into an order comes back with a `reference` the shopper must be
   * given. Flattening those to a string would throw that away.
   */
  body?: Record<string, unknown>;
  constructor(
    message: string,
    status: number,
    requestId?: string,
    body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.body = body;
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Attach `Authorization: Bearer <token>` from the stored JWT. */
  auth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = false } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const preview = getPreviewToken();
  if (preview) headers["x-maintenance-preview"] = preview;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error — could not reach the server.", 0);
  }

  // Parse a JSON body when present (error bodies included).
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // A 401 on an authenticated call means the stored session is no longer
    // valid — sign the user out completely and send them to the login screen so
    // their next action can't hit the same error.
    if (res.status === 401 && auth) forceSignOut();
    const record = (data ?? {}) as {
      message?: string | string[];
      requestId?: string;
    };
    const rawMessage = record.message;
    const message =
      (Array.isArray(rawMessage) ? rawMessage[0] : rawMessage) ||
      "Something went wrong. Please try again.";
    throw new ApiError(
      message,
      res.status,
      record.requestId,
      (data ?? undefined) as Record<string, unknown> | undefined,
    );
  }

  return data as T;
}
