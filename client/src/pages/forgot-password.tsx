import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/useAuth";

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = (data: Form) => {
    forgot.mutate(data.email, {
      // Backend returns a generic message either way (anti-enumeration), so we
      // always show the same "check your inbox" confirmation — we never reveal
      // whether an account exists. The reset token arrives only by email.
      onSuccess: () => {
        setSentTo(data.email);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      },
    });
  };

  return (
    <>
      <SEO title="Reset password — Jakalburg" description="Reset your Jakalburg password." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            {sentTo ? (
              <>
                <h1 className="text-3xl">Check your inbox</h1>
                <p className="mt-2 text-xs text-mute-text">
                  If an account exists for{" "}
                  <span className="font-medium">{sentTo}</span>, we&apos;ve emailed a link to
                  reset your password. The link expires and can be used only once.
                </p>
                <p className="mt-6 text-xs text-mute-text">
                  Didn&apos;t get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    onClick={() => setSentTo(null)}
                    className="underline underline-offset-4"
                  >
                    try a different email
                  </button>
                  .
                </p>
                <p className="mt-6 text-center text-xs">
                  <Link href="/login" className="underline underline-offset-4">Back to sign in</Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl">Reset your password</h1>
                <p className="mt-2 text-xs text-mute-text">
                  Enter your email and we&apos;ll send you a link to reset your password.
                </p>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                    {form.formState.errors.email && (
                      <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" loading={forgot.isPending}>
                    Send reset link
                  </Button>
                </form>
                <p className="mt-6 text-center text-xs">
                  Remembered it? <Link href="/login" className="underline underline-offset-4">Back to sign in</Link>
                </p>
              </>
            )}
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
