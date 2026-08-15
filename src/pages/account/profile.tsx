import { useEffect, useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AccountShell } from "@/components/account/AccountShell";
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

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(update_profile(form));
    if (user) dispatch(sign_in({ ...user, name: form.fullName || user.name, email: form.email || user.email }));
    toast.success("Profile updated");
  };

  return (
    <>
      <SEO title="Profile — Jakalburg" noIndex />
      <SiteLayout hideNewsletter>
        <AccountShell>
          <h2 className="text-xl">Profile</h2>
          {!hydrated ? null : (
            <form onSubmit={save} className="mt-6 max-w-md space-y-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          )}
        </AccountShell>
      </SiteLayout>
    </>
  );
}
