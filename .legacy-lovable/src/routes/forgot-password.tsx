import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Jakalburg" },
      { name: "description", content: "Reset your Jakalburg password (demo)." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <SiteLayout hideNewsletter>
      <section className="container-vh py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl">Reset your password</h1>
          <p className="mt-2 text-xs text-mute-text">
            Demo — no email is actually sent. In a real store, we'd send you a reset link.
          </p>
          {sent ? (
            <div className="mt-8 border p-6 text-sm">
              <p>If <span className="font-medium">{email}</span> matches an account, a reset link would arrive shortly.</p>
              <Button asChild variant="outline" className="mt-4"><Link to="/login">Back to sign in</Link></Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setSent(true);
              }}
              className="mt-8 space-y-4"
            >
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">Send reset link</Button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
