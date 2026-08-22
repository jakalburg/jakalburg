import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useVerifyEmail, useResendOtp } from "@/hooks/useAuth";
import { suppressNextRouteLoader } from "@/components/common/route-loader";

const RESEND_COOLDOWN = 60; // seconds — mirrors the backend resend cooldown.

export default function VerifyEmailPage() {
  const router = useRouter();
  const email = typeof router.query.email === "string" ? router.query.email : "";
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const verify = useVerifyEmail();
  const resend = useResendOtp();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = (code: string = otp) => {
    if (code.length !== 6 || !email || verify.isPending) return;
    verify.mutate(
      { email, otp: code },
      {
        onSuccess: () => {
          toast.success("Email verified — you're signed in");
          suppressNextRouteLoader();
          void router.push("/account");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Verification failed.");
          setOtp("");
        },
      },
    );
  };

  // Auto-submit as soon as the final digit lands (typed or pasted).
  const onOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) submit(value);
  };

  const onResend = () => {
    if (!email || cooldown > 0) return;
    resend.mutate(
      { email, purpose: "SIGNUP_VERIFICATION" },
      {
        onSuccess: () => {
          toast.success("A new code is on its way");
          setCooldown(RESEND_COOLDOWN);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Could not resend the code.");
        },
      },
    );
  };

  return (
    <>
      <SEO title="Verify your email — Jakalburg" description="Enter the code we emailed you." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl">Verify your email</h1>
            {email ? (
              <p className="mt-2 text-xs text-mute-text">
                Enter the 6-digit code we sent to <span className="font-medium">{email}</span>.
              </p>
            ) : (
              <p className="mt-2 text-xs text-destructive">
                Missing email address.{" "}
                <Link href="/signup" className="underline underline-offset-4">Start again</Link>.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="mt-8 space-y-6"
            >
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={onOtpChange} disabled={!email || verify.isPending}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={otp.length !== 6 || !email} loading={verify.isPending}>
                Verify email
              </Button>
            </form>

            <div className="mt-6 text-center text-xs text-mute-text">
              Didn&apos;t get it?{" "}
              <button
                type="button"
                onClick={onResend}
                disabled={!email || cooldown > 0 || resend.isPending}
                className="inline-flex items-center gap-1 underline underline-offset-4 disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : resend.isPending ? (
                  <Loader size={16} />
                ) : (
                  "Resend code"
                )}
              </button>
            </div>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
