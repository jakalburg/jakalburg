import Link from "next/link";
import { useRouter } from "next/router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import GoogleOneTap from "@/components/auth/GoogleOneTap";
import { useLoginPassword } from "@/hooks/useAuth";
import { suppressNextRouteLoader } from "@/components/common/route-loader";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLoginPassword();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: Form) => {
    login.mutate(data, {
      onSuccess: () => {
        toast.success("Welcome back");
        const redirect =
          typeof router.query.redirect === "string" ? router.query.redirect : "/account";
        suppressNextRouteLoader();
        void router.push(redirect);
      },
      onError: (err) => {
        const message =
          err instanceof Error ? err.message : "Could not sign in.";
        // Unverified accounts are sent to the verification page prefilled.
        if (/verify/i.test(message)) {
          toast.error(message);
          void router.push(
            `/verify-email?email=${encodeURIComponent(data.email)}`,
          );
          return;
        }
        toast.error(message);
      },
    });
  };

  return (
    <>
      <SEO title="Sign in — Jakalburg" description="Sign in to your Jakalburg account." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl">Sign in</h1>
            <p className="mt-2 text-xs text-mute-text">
              Welcome back. Sign in to your Jakalburg account.
            </p>

            <div className="mt-8">
              <GoogleOneTap redirectTo="/account" />
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-mute-text">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" autoComplete="current-password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" loading={login.isPending}>
                Sign in
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs">
              <Link href="/forgot-password" className="underline underline-offset-4">Forgot password?</Link>
              <Link href="/signup" className="underline underline-offset-4">Create an account</Link>
            </div>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
