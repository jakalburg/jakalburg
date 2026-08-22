// Minimal fetch wrapper for the Jakalburg NestJS backend. No extra HTTP
// dependency — plain fetch + a typed error. The JWT is the canonical source of
// truth here (localStorage key "auth_token"); the redux auth slice reads it
// through getToken()/setToken()/clearToken() so serialization stays consistent.

const TOKEN_KEY = "auth_token";

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

export class ApiError extends Error {
  status: number;
  requestId?: string;
  constructor(message: string, status: number, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
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
    // A 401 on an authenticated call means the stored token is stale — drop it.
    if (res.status === 401 && auth) clearToken();
    const record = (data ?? {}) as {
      message?: string | string[];
      requestId?: string;
    };
    const rawMessage = record.message;
    const message =
      (Array.isArray(rawMessage) ? rawMessage[0] : rawMessage) ||
      "Something went wrong. Please try again.";
    throw new ApiError(message, res.status, record.requestId);
  }

  return data as T;
}
