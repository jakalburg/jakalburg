import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth";
import { useAddressesStore } from "@/stores/addresses";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(4, "Enter your password"),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Jakalburg" },
      { name: "description", content: "Sign in to your Jakalburg account (demo)." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const updateProfile = useAddressesStore((s) => s.updateProfile);
  const nav = useNavigate();
  const [note] = useState("Demo — any email and password will sign you in.");
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = (data: Form) => {
    const name = data.email.split("@")[0].replace(/[.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    signIn({ email: data.email, name });
    updateProfile({ email: data.email, fullName: name });
    void nav({ to: "/account" });
  };

  return (
    <SiteLayout hideNewsletter>
      <section className="container-vh py-16">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl">Sign in</h1>
          <p className="mt-2 text-xs text-mute-text">{note}</p>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password && <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
          <div className="mt-6 flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="underline underline-offset-4">Forgot password?</Link>
            <Link to="/signup" className="underline underline-offset-4">Create an account</Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
