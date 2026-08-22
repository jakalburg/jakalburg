import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLinkGoogle } from "@/hooks/useAuth";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// Account-settings "Connect Google". Renders Google's native button (same GIS
// script and design used on the login page — no OAuth redirect) and, on
// credential, POSTs the ID token to /auth/google/link. The server verifies the
// token and links the Google identity to the signed-in user; it never merges
// into another account. Only mounted when the user has NO Google linked, so it
// won't clash with <GoogleOneTap /> (which lives on login/signup, not here).
export function ConnectGoogleButton() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const linkGoogle = useLinkGoogle();

  // Keep the latest mutation in a ref so the once-registered GIS callback
  // always calls the current version without re-initializing GIS.
  const linkRef = useRef(linkGoogle);
  linkRef.current = linkGoogle;

  useEffect(() => {
    if (!CLIENT_ID) {
      console.error(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google connect disabled.",
      );
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const handleCredential = (response: { credential?: string }) => {
      if (!response?.credential) return;
      linkRef.current.mutate(response.credential, {
        onSuccess: () => {
          toast.success("Google connected");
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : "Could not connect Google. Please try again.";
          toast.error(message);
        },
      });
    };

    const init = (): boolean => {
      if (cancelled || !window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: false,
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: 300,
        });
      }
      return true;
    };

    // GIS may not be parsed yet — poll for window.google, give up after 10s.
    if (!init()) {
      interval = setInterval(() => {
        if (init() && interval) clearInterval(interval);
      }, 200);
      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
      }, 10_000);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
    // Intentionally run once on mount; latest values are read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} className="flex min-h-[44px] justify-start" />;
}
