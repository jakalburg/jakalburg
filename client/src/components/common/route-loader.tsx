import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Loader } from "@/components/ui/loader";

// One-shot flag: when a navigation is triggered by an action that already shows
// its own loading widget (e.g. a button with `loading`), we don't want to *also*
// flash the full-page barrier. Callers set this right before router.push so the
// very next route change skips the global loader. A short self-heal timer drops
// the flag if no navigation actually starts.
let suppressNext = false;
let suppressTimer: ReturnType<typeof setTimeout> | null = null;
export function suppressNextRouteLoader() {
  suppressNext = true;
  if (suppressTimer) clearTimeout(suppressTimer);
  suppressTimer = setTimeout(() => {
    suppressNext = false;
    suppressTimer = null;
  }, 1000);
}

// Global route-transition loader. Mounted once (in _app), it listens to Next's
// router events so every client-side navigation/redirect — <Link> clicks,
// router.push after login, etc. — shows a consistent dimmed barrier with a
// centered loader. No per-link wiring needed, except actions that own their
// loading widget, which opt out via suppressNextRouteLoader().
export function RouteLoader() {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const start = (url: string, { shallow }: { shallow: boolean }) => {
      // Action-owned loading (e.g. a button spinner) opts this one out.
      if (suppressNext) {
        suppressNext = false;
        if (suppressTimer) {
          clearTimeout(suppressTimer);
          suppressTimer = null;
        }
        return;
      }
      // Ignore shallow (query-only) changes and same-path navigations.
      if (shallow || url === router.asPath) return;
      // Delay slightly so instant/cached transitions don't flash the barrier.
      clear();
      timer = setTimeout(() => setActive(true), 120);
    };
    const stop = () => {
      clear();
      setActive(false);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", stop);
    router.events.on("routeChangeError", stop);
    return () => {
      clear();
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", stop);
      router.events.off("routeChangeError", stop);
    };
  }, [router]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-[1px]"
    >
      <div className="rounded-md border bg-card px-10 py-8 shadow-sm">
        <Loader size={44} />
      </div>
    </div>
  );
}
