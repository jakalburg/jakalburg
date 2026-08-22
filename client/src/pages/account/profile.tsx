import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AccountShell } from "@/components/account/AccountShell";
import { ConnectGoogleButton } from "@/components/auth/ConnectGoogleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectProfile, update_profile } from "@/redux/features/addresses-slice";
import { selectAuthUser, sign_in } from "@/redux/features/auth-slice";
import { useHydrated } from "@/hooks/useHydrated";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const profile = useAppSelector(selectProfile);
  const user = useAppSelector(selectAuthUser);
  const [form, setForm] = useState(profile);

  useEffect(() => setForm(profile), [profile]);

  // Email is the fixed identity anchor (it anchors Google linking), so it is
  // shown but not editable here — the account email always wins.
  const accountEmail = user?.email || form.email;
  const googleConnected = !!user?.providers?.includes("google");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(update_profile({ ...form, email: accountEmail }));
    if (user) dispatch(sign_in({ ...user, name: form.fullName || user.name }));
    toast.success("Profile updated");
  };

  return (
    <>
      <SEO title="Profile — Jakalburg" noIndex />
      <SiteLayout hideNewsletter>
        <AccountShell>
          <h2 className="text-xl">Profile</h2>
          {!hydrated ? null : (
            <>
              <form onSubmit={save} className="mt-6 max-w-md space-y-4">
                <div>
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={accountEmail} readOnly disabled className="cursor-not-allowed opacity-70" />
                  <p className="mt-1 text-xs text-mute-text">Your email can&apos;t be changed.</p>
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <Button type="submit">Save changes</Button>
              </form>

              <div className="mt-12 max-w-md border-t border-border pt-8">
                <h3 className="text-base font-medium">Connected accounts</h3>
                <p className="mt-1 text-xs text-mute-text">
                  Sign in faster by connecting an account. Connecting won&apos;t change your email.
                </p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-sm">Google</span>
                  {googleConnected ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-mute-text">
                      <Check className="size-4 text-foreground" aria-hidden="true" />
                      Connected
                    </span>
                  ) : (
                    <ConnectGoogleButton />
                  )}
                </div>
              </div>
            </>
          )}
        </AccountShell>
      </SiteLayout>
    </>
  );
}
