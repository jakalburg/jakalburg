import { useEffect, useState } from "react";
import type { GetServerSideProps } from "next";
import SEO from "@/components/seo";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const DEFAULT_TITLE = "We’ll be back shortly";
const DEFAULT_MESSAGE =
  "The shop is closed for scheduled maintenance. Thanks for your patience — please check back soon.";

interface MaintenanceProps {
  title: string;
  message: string;
  endsAt: string | null;
  /**
   * Brand, served alongside the banner copy by /maintenance/status.
   *
   * It has to come from there rather than from useSiteSettings(): while
   * maintenance is on, GET /settings is blocked like every other endpoint, so
   * the hook would fail and silently fall back to the logo bundled with the
   * client — showing a stale mark after the admin uploads a new one.
   */
  storeName: string | null;
  logo: string | null;
}

/** Days/hours/minutes/seconds until `target`, or null once it has passed. */
function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!target) return;
    const end = new Date(target).getTime();
    if (Number.isNaN(end)) return;

    const tick = () => setRemaining(Math.max(0, end - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (remaining === null || remaining <= 0) return null;

  return [
    ["Days", Math.floor(remaining / 86400000)],
    ["Hours", Math.floor((remaining % 86400000) / 3600000)],
    ["Minutes", Math.floor((remaining % 3600000) / 60000)],
    ["Seconds", Math.floor((remaining % 60000) / 1000)],
  ] as [string, number][];
}

/**
 * The storefront's maintenance screen.
 *
 * Deliberately standalone — no SiteLayout. The header and footer link to
 * pages that are blocked and fetch data the API is refusing, so rendering
 * them here would mean a shell full of dead links and failed requests.
 *
 * Reached only by the middleware rewrite, which also sets HTTP 503, so
 * crawlers read this as a temporary outage rather than the real homepage.
 */
export default function MaintenancePage({
  title,
  message,
  endsAt,
  storeName: serverStoreName,
  logo: serverLogo,
}: MaintenanceProps) {
  // The hook is the fallback, not the source: it only resolves when the API is
  // reachable (i.e. someone hit /maintenance directly while the shop is open).
  const site = useSiteSettings();
  const storeName = serverStoreName || site.storeName;
  const logo = serverLogo || site.logo;
  const units = useCountdown(endsAt);

  return (
    <>
      <SEO pageTitle={title} noIndex />
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-center">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={storeName}
            className="mb-10 h-10 w-auto object-contain"
          />
        ) : (
          <p className="eyebrow mb-10 text-mute-text">{storeName}</p>
        )}

        <h1 className="max-w-2xl text-4xl md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-md text-sm text-muted-foreground">{message}</p>

        {units && (
          <div className="mt-12 grid w-full max-w-md grid-cols-4 gap-3">
            {units.map(([label, value]) => (
              <div key={label} className="border border-input bg-card p-4">
                <div className="text-2xl font-medium tabular-nums md:text-3xl">
                  {String(value).padStart(2, "0")}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

/**
 * Fetch the banner copy server-side so the first paint is correct rather than
 * flashing defaults. Falls back to the defaults if the API can't be reached —
 * the page must render no matter what, since it is the only thing a visitor
 * can see.
 */
export const getServerSideProps: GetServerSideProps<MaintenanceProps> = async ({
  res,
}) => {
  // Keep the 503 on a direct hit to /maintenance too, not just on rewrites.
  res.statusCode = 503;
  res.setHeader("Retry-After", "3600");

  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080")
    .replace(/\/+$/, "")
    .replace(/\/api$/, "");

  try {
    const response = await fetch(`${base}/api/maintenance/status`);
    if (response.ok) {
      const data = (await response.json()) as Partial<MaintenanceProps>;
      return {
        props: {
          title: data.title?.trim() || DEFAULT_TITLE,
          message: data.message?.trim() || DEFAULT_MESSAGE,
          endsAt: data.endsAt ?? null,
          storeName: data.storeName?.trim() || null,
          logo: data.logo?.trim() || null,
        },
      };
    }
  } catch {
    // fall through to defaults
  }

  return {
    props: {
      title: DEFAULT_TITLE,
      message: DEFAULT_MESSAGE,
      endsAt: null,
      // Null, not a guess: the component falls back to useSiteSettings(),
      // which ends at the bundled /logo.png.
      storeName: null,
      logo: null,
    },
  };
};
