import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Jakalburg" },
      { name: "description", content: "Terms of use for the Jakalburg demo storefront." },
      { property: "og:title", content: "Terms — Jakalburg" },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <SiteLayout>
      <section className="container-vh max-w-3xl py-16">
        <p className="eyebrow text-mute-text">Legal</p>
        <h1 className="mt-3 text-3xl md:text-4xl">Terms of use.</h1>
        <div className="prose mt-8 max-w-none text-sm text-muted-foreground">
          <p>This is a demonstration site. No transactions are processed and no goods are shipped. Use the site to explore the design and interaction only.</p>
          <p className="mt-4">All imagery is used under royalty-free licence and is representative rather than of specific product samples.</p>
        </div>
      </section>
    </SiteLayout>
  ),
});
