import { NextRequest, NextResponse } from "next/server";

/**
 * Maintenance gate for the storefront.
 *
 * Runs before every page request. When maintenance is on, every route is
 * rewritten to /maintenance and served with HTTP 503 — the status matters:
 * a maintenance page returned as 200 invites search engines to index "we're
 * closed" as the homepage, while 503 + Retry-After is understood as temporary
 * and leaves rankings alone.
 *
 * TRUST BOUNDARY: this middleware decides nothing on its own. It forwards
 * whatever preview token the visitor has to the API and does what the API
 * says. The token is checked there against a stored hash with a constant-time
 * compare, so a visitor cannot grant themselves access by setting a cookie —
 * the cookie is only a carrier for a 256-bit secret they must already hold.
 *
 * The API enforces the same rule independently (MaintenanceGuard), so even if
 * this middleware were bypassed entirely, there is nothing to read: every
 * storefront endpoint answers 503.
 */

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/+$/, "").replace(/\/api$/, "");

/** Cookie the preview token is parked in, so it survives navigation. */
export const PREVIEW_COOKIE = "jb_preview";
const PREVIEW_HEADER = "x-maintenance-preview";

/** How long a failed status lookup is assumed to mean "not in maintenance". */
const STATUS_TIMEOUT_MS = 2500;

interface MaintenanceStatus {
  active: boolean;
  bypass: boolean;
}

/**
 * Ask the API. Failing OPEN is deliberate: if the status call times out we
 * serve the site. The alternative — showing a maintenance page because the
 * API hiccupped — turns a brief backend blip into a self-inflicted outage,
 * and the API is already refusing traffic on its own if it really is down.
 */
async function fetchStatus(token?: string): Promise<MaintenanceStatus> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);

    const res = await fetch(`${API_BASE}/api/maintenance/status`, {
      headers: token ? { [PREVIEW_HEADER]: token } : {},
      signal: controller.signal,
      // Short cache so flipping the switch takes effect quickly without
      // putting a request on the API for every single page view.
      next: { revalidate: 10 },
    });
    clearTimeout(timer);

    if (!res.ok) return { active: false, bypass: false };
    return (await res.json()) as MaintenanceStatus;
  } catch {
    return { active: false, bypass: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // A fresh token on the URL wins over whatever is in the cookie, so a newly
  // generated preview link always works even if an old one is stored.
  const tokenFromUrl = searchParams.get("preview") ?? undefined;
  const token = tokenFromUrl || request.cookies.get(PREVIEW_COOKIE)?.value;

  const status = await fetchStatus(token);

  // Persist a token that the API has just confirmed. Never persist an
  // unverified one — an invalid token in a cookie would be dead weight that
  // also defeats the "URL wins" rule above.
  const persistToken = (response: NextResponse) => {
    if (tokenFromUrl && status.bypass) {
      response.cookies.set(PREVIEW_COOKIE, tokenFromUrl, {
        // NOT httpOnly, deliberately: the storefront's own fetches must send
        // this token as a header or the API would 503 them, leaving a
        // bypassing admin with a shell of a site. Readable-by-JS is the cost
        // of the bypass working at all, and the token grants nothing beyond
        // viewing the site during a maintenance window.
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return response;
  };

  if (!status.active || status.bypass) {
    return persistToken(NextResponse.next());
  }

  // Already on the maintenance page — serve it, but keep the 503.
  if (pathname === "/maintenance") {
    return new NextResponse(null, {
      status: 503,
      headers: { "Retry-After": "3600", "x-middleware-rewrite": request.url },
    });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";

  const response = NextResponse.rewrite(url, {
    status: 503,
    headers: { "Retry-After": "3600" },
  });
  return persistToken(response);
}

/**
 * Skip Next internals, the API proxy and static files. Everything a human can
 * navigate to is covered; assets are harmless to serve and excluding them
 * keeps the status lookup off the hot path for every image on the page.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};
