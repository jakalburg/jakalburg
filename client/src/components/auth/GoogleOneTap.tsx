import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { useGoogleLogin } from "@/hooks/useAuth";

declare global {
  interface Window {
    // Google Identity Services global (loaded from _document); typed loosely.
    google?: any;
    // Guard so the One Tap prompt is shown at most once per page session.
    __jb_one_tap_shown?: boolean;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleOneTapProps {
  /** Show the floating One Tap prompt (in addition to the rendered button). */
  autoPrompt?: boolean;
  /** Where to send the user after a successful sign-in. */
  redirectTo?: string;
}

// Renders Google's native "Continue with Google" button and (optionally) the
// One Tap prompt. The GIS script is loaded once in _document. On credential we
// POST the Google ID token to the backend, which verifies it server-side and
// returns our own { user, accessToken }.
export default function GoogleOneTap({
  autoPrompt = true,
  redirectTo = "/account",
}: GoogleOneTapProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const googleLogin = useGoogleLogin();

  // Keep the latest mutation/redirect in refs so the GIS callback (registered
  // once) always calls the current versions without re-initializing GIS.
  const loginRef = useRef(googleLogin);
  loginRef.current = googleLogin;
  const redirectRef = useRef(redirectTo);
  redirectRef.current = redirectTo;

  useEffect(() => {
    if (!CLIENT_ID) {
      console.error(
        "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — Google sign-in disabled.",
      );
      return;
    }

    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const handleCredential = (response: { credential?: string }) => {
      if (!response?.credential) return;
      loginRef.current.mutate(response.credential, {
        onSuccess: () => {
          toast.success("Signed in with Google");
          void router.push(redirectRef.current);
        },
        onError: (err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : "Google sign-in failed. Please try again.";
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
          width: 360,
        });
      }
      if (autoPrompt && !window.__jb_one_tap_shown) {
        window.__jb_one_tap_shown = true;
        window.google.accounts.id.prompt();
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
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
      window.__jb_one_tap_shown = false;
    };
    // Intentionally run once on mount; latest values are read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} className="flex min-h-[44px] justify-center" />;
}
