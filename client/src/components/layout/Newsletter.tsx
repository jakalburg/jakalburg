import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok">("idle");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("ok");
    setEmail("");
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
          <Button type="submit" className="h-11 px-6">Subscribe</Button>
        </form>
        {status === "ok" && (
          <p className="text-sm text-muted-foreground md:col-span-2" role="status">
            Thanks — you&apos;re on the list.
          </p>
        )}
      </div>
    </section>
  );
}
