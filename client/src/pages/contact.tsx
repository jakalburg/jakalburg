import { useState } from "react";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  useContactPage,
  type ContactPageContent,
} from "@/hooks/useContactPage";

// Basic "looks like an email" check — validate in the UI before we hit the API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fetch the admin-edited Contact content at build/ISR time so the first paint
// already shows the real details instead of the fallback copy.
export async function getStaticProps() {
  let initialContact: ContactPageContent | null = null;
  try {
    initialContact = await apiFetch<ContactPageContent>(
      API_ENDPOINTS.website.contact,
    );
  } catch {
    initialContact = null;
  }
  return { props: { initialContact }, revalidate: 60 };
}

export default function ContactPage({
  initialContact,
}: {
  initialContact: ContactPageContent | null;
}) {
  const { data: contact } = useContactPage(initialContact ?? undefined);
  // Admin-edited details, with fallbacks so the page never looks empty.
  const heading = contact?.title?.trim() || "We're here to help.";
  const intro =
    contact?.formDescription?.trim() ||
    "Questions about a piece, an order, or fit? Our care team responds within one business day.";
  const email = contact?.email?.trim();
  const phone = contact?.phone?.trim();
  const address = contact?.address?.trim();
  const mapLink = contact?.mapLink?.trim();

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.message || submitting) return;
    if (!EMAIL_RE.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      // Persist to the backend so it lands in the admin Contact inbox.
      await apiFetch(API_ENDPOINTS.contact.submit, {
        method: "POST",
        body: {
          type: "contact_us",
          name: form.name.trim() || undefined,
          email: form.email.trim(),
          message: form.message.trim(),
        },
      });
      toast.success("Thanks — we'll be in touch shortly.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Couldn't send your message. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="mt-3 text-3xl md:text-4xl">{heading}</h1>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              {intro}
            </p>
            <dl className="mt-8 space-y-3 text-sm">
              {email && (
                <div>
                  <dt className="eyebrow text-mute-text">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${email}`}
                      className="hover:text-foreground"
                    >
                      {email}
                    </a>
                  </dd>
                </div>
              )}
              {phone && (
                <div>
                  <dt className="eyebrow text-mute-text">Phone</dt>
                  <dd>
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="hover:text-foreground"
                    >
                      {phone}
                    </a>
                  </dd>
                </div>
              )}
              {address && (
                <div>
                  <dt className="eyebrow text-mute-text">Studio</dt>
                  <dd>
                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {address}
                      </a>
                    ) : (
                      address
                    )}
                  </dd>
                </div>
              )}
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
            <Button type="submit" loading={submitting}>
              Send message
            </Button>
          </form>
        </section>
      </SiteLayout>
    </>
  );
}
