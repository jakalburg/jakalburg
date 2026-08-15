import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy — Jakalburg" },
      { name: "description", content: "How Jakalburg handles your data." },
      { property: "og:title", content: "Privacy — Jakalburg" },
      { property: "og:url", content: "/privacy-policy" },
    ],
    links: [{ rel: "canonical", href: "/privacy-policy" }],
  }),
  component: () => (
    <SiteLayout>
      <section className="container-vh max-w-3xl py-16">
        <p className="eyebrow text-mute-text">Policy</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Privacy.</h1>
        <div className="prose mt-8 max-w-none text-sm text-muted-foreground">
          <p>
            This is a demo storefront. No personal data is transmitted to any server — everything you enter is kept in your browser's local storage only, and can be cleared by clearing site data.
          </p>
          <p className="mt-4">
            A production Jakalburg store would collect the minimum data needed to fulfil your order (name, address, contact, order history) and never share it with third parties beyond our shipping partners.
          </p>
        </div>
      </section>
    </SiteLayout>
  ),
});
