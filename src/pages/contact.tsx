import { useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.message) return;
    toast.success("Thanks — we'll be in touch shortly.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <>
      <SEO
        title="Contact — Jakalburg"
        description="Get in touch with Jakalburg."
        canonicalPath="/contact"
      />
      <SiteLayout>
        <section className="container-vh grid gap-12 py-16 md:grid-cols-2">
          <div>
            <p className="eyebrow text-mute-text">Contact</p>
            <h1 className="mt-3 text-3xl md:text-4xl">We&apos;re here to help.</h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Questions about a piece, an order, or fit? Our care team responds within one business day.
            </p>
            <dl className="mt-8 space-y-3 text-sm">
              <div><dt className="eyebrow text-mute-text">Email</dt><dd>care@jakalburg.example</dd></div>
              <div><dt className="eyebrow text-mute-text">Hours</dt><dd>Mon–Fri · 10am – 6pm IST</dd></div>
              <div><dt className="eyebrow text-mute-text">Studio</dt><dd>Bandra West, Mumbai</dd></div>
            </dl>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <Button type="submit">Send message</Button>
          </form>
        </section>
      </SiteLayout>
    </>
  );
}
