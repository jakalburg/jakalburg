"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { signIn, getSession } from "@/lib/mock-auth";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { AUTH_SESSION_MAX_AGE } from "@/config/auth.constant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Login] Submitted credentials", {
          email,
          passwordLength: password.length,
          passwordPreview: password ? "*".repeat(password.length) : "",
          matchesExpectedAdminPassword: password === "admin@123",
        });
      }

      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[Admin Login] NextAuth result", {
          ok: result?.ok,
          status: result?.status,
          error: result?.error,
        });
      }

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        const session = await getSession();

        if (!session || result?.ok === false) {
          toast.error(
            "Failed to establish session. Please try again or check your network connection.",
          );
          return;
        }

        if ((session as any)?.accessToken) {
          Cookies.set("admin_access_token", (session as any).accessToken, {
            expires: AUTH_SESSION_MAX_AGE / (24 * 60 * 60),
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
          });
        }

        toast.success("Logged in successfully");
        // Use router.refresh() first to update server state, then redirect
        router.refresh();
        // Small delay to ensure session is established
        setTimeout(() => {
          router.push(callbackUrl);
        }, 500);
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-bold text-gray-700 ml-1"
          >
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 px-5 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 text-base"
            placeholder="admin@gmail.com"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-bold text-gray-700 ml-1"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 px-5 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-300 text-base"
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 transition-all duration-300 active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "Authenticate Now"
          )}
        </Button>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#fafafa]">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />

      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[440px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="text-center space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg shadow-primary/10 ring-1 ring-black/5">
                <Image
                  src="/mini_logo.png"
                  alt="Jakalburg"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                  priority
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-extrabold tracking-tight text-gray-900">
                  Welcome Back
                </h2>
                <p className="text-base text-gray-500 font-medium">
                  Enter your details to manage your Jakalburg dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-white/40">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-gray-500">
                    Preparing secure login...
                  </p>
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-sm text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Jakalburg Admin. Powered by RuRhy.
          </p>
        </div>
      </div>
    </div>
  );
}
