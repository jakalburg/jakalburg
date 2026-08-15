import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddressesStore } from "@/stores/addresses";
import { useAuthStore } from "@/stores/auth";
import { useHydrated } from "@/hooks/useHydrated";
import { toast } from "sonner";

export const Route = createFileRoute("/account/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Jakalburg" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const hydrated = useHydrated();
  const profile = useAddressesStore((s) => s.profile);
  const updateProfile = useAddressesStore((s) => s.updateProfile);
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const [form, setForm] = useState(profile);

  useEffect(() => setForm(profile), [profile]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    if (user) signIn({ ...user, name: form.fullName || user.name, email: form.email || user.email });
    toast.success("Profile updated");
  };

  return (
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
  );
}
