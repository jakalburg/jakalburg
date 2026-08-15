import Link from "next/link";
import { useRouter } from "next/router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/redux/hooks";
import { sign_in } from "@/redux/features/auth-slice";
import { update_profile } from "@/redux/features/addresses-slice";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "" } });

  const onSubmit = (data: Form) => {
    dispatch(sign_in({ email: data.email, name: data.name }));
    dispatch(update_profile({ email: data.email, fullName: data.name }));
    void router.push("/account");
  };

  return (
    <>
      <SEO title="Create an account — Jakalburg" description="Create a Jakalburg account (demo)." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl">Create an account</h1>
            <p className="mt-2 text-xs text-mute-text">Demo — no email is sent, no data leaves your browser.</p>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
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
              <Button type="submit" className="w-full">Create account</Button>
            </form>
            <p className="mt-6 text-center text-xs">
              Already have an account? <Link href="/login" className="underline underline-offset-4">Sign in</Link>
            </p>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
