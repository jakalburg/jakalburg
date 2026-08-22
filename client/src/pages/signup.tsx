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
import { useRegister } from "@/hooks/useAuth";
import { suppressNextRouteLoader } from "@/components/common/route-loader";

const schema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type Form = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onSubmit = (data: Form) => {
    register.mutate(data, {
      onSuccess: () => {
        toast.success("Account created — check your email for a code");
        suppressNextRouteLoader();
        void router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Could not create account.");
      },
    });
  };

  return (
    <>
      <SEO title="Create an account — Jakalburg" description="Create a Jakalburg account." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          <div className="mx-auto max-w-md">
            <h1 className="text-3xl">Create an account</h1>
            <p className="mt-2 text-xs text-mute-text">
              We&apos;ll email you a 6-digit code to verify your address.
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" autoComplete="given-name" {...form.register("firstName")} />
                  {form.formState.errors.firstName && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" autoComplete="family-name" {...form.register("lastName")} />
                  {form.formState.errors.lastName && (
                    <p className="mt-1 text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" autoComplete="new-password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" loading={register.isPending}>
                Create account
              </Button>
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
