import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/useAuth";
import { suppressNextRouteLoader } from "@/components/common/route-loader";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";
  const email = typeof router.query.email === "string" ? router.query.email : "";
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const reset = useResetPassword();

  // Wait for the router to hydrate query params before deciding the link is bad.
  const linkReady = router.isReady;
  const hasLink = !!token && !!email;
  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const canSubmit =
    hasLink && newPassword.length >= 8 && newPassword === confirm && !reset.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    reset.mutate(
      { email, token, newPassword },
      {
        onSuccess: () => {
          toast.success("Password reset — please sign in");
          suppressNextRouteLoader();
          void router.push("/login");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Could not reset password.");
        },
      },
    );
  };

  return (
    <>
      <SEO title="Set a new password — Jakalburg" description="Choose a new password." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl">Set a new password</h1>

            {linkReady && !hasLink ? (
              <p className="mt-2 text-xs text-destructive">
                This reset link is invalid or incomplete.{" "}
                <Link href="/forgot-password" className="underline underline-offset-4">
                  Request a new one
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="mt-2 text-xs text-mute-text">
                  {email ? (
                    <>
                      Choose a new password for <span className="font-medium">{email}</span>.
                    </>
                  ) : (
                    "Choose a new password for your account."
                  )}
                </p>

                <form onSubmit={submit} className="mt-8 space-y-6">
                  <div>
                    <Label htmlFor="newPassword">New password</Label>
                    <PasswordInput
                      id="newPassword"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={!hasLink || reset.isPending}
                    />
                    <p className="mt-1 text-xs text-mute-text">At least 8 characters.</p>
                  </div>
                  <div>
                    <Label htmlFor="confirm">Confirm new password</Label>
                    <PasswordInput
                      id="confirm"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={!hasLink || reset.isPending}
                    />
                    {mismatch && (
                      <p className="mt-1 text-xs text-destructive">Passwords don&apos;t match.</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={!canSubmit} loading={reset.isPending}>
                    Reset password
                  </Button>
                </form>
              </>
            )}
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
