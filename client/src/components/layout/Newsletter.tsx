import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// Basic "looks like an email" check — validate in the UI before we hit the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "error" | "invalid"
  >("idle");
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || status === "loading") return;
    if (!EMAIL_RE.test(value)) {
      setStatus("invalid");
      return;
    }
    setStatus("loading");
    try {
      // Record the signup so it shows up in the admin Newsletter inbox.
      await apiFetch(API_ENDPOINTS.contact.submit, {
        method: "POST",
        body: { type: "newsletter", email: value },
      });
      setStatus("ok");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };
  return (
    <section className="border-y bg-stone">
      <div className="container-vh grid gap-8 py-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="eyebrow text-mute-text">Newsletter</p>
          <h2 className="mt-3 text-2xl md:text-3xl">Considered pieces, in your inbox.</h2>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Occasional notes on new arrivals, restocks, and the makers behind the pieces. No noise.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex w-full max-w-md items-center gap-2 md:justify-self-end">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            className="h-11 bg-background"
          />
          <Button
            type="submit"
            className="h-11 px-6"
            loading={status === "loading"}
          >
            Subscribe
          </Button>
        </form>
        {status === "ok" && (
          <p className="text-sm text-muted-foreground md:col-span-2" role="status">
            Thanks — you&apos;re on the list.
          </p>
        )}
        {status === "invalid" && (
          <p className="text-sm text-destructive md:col-span-2" role="status">
            Please enter a valid email address.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-destructive md:col-span-2" role="status">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}
