import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { heroImages } from "@/data/images";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Jakalburg" },
      { name: "description", content: "The story behind Jakalburg — considered ready-to-wear built to be kept." },
      { property: "og:title", content: "About — Jakalburg" },
      { property: "og:description", content: "Considered ready-to-wear built to be kept." },
      { property: "og:image", content: heroImages.about },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SiteLayout>
      <section>
        <img src={heroImages.about} alt="Jakalburg studio" className="h-[50vh] w-full object-cover" />
      </section>
      <section className="container-vh grid gap-10 py-16 md:grid-cols-2">
        <div>
          <p className="eyebrow text-mute-text">Our story</p>
          <h1 className="mt-3 text-3xl md:text-4xl">A small studio, patient work.</h1>
        </div>
        <div className="space-y-6 text-sm text-muted-foreground md:text-base">
          <p>
            Jakalburg is a considered ready-to-wear label. We work with a small palette of natural fibres — long-staple cottons, European linens, fine merino and Japanese denim — and cut them into a wardrobe that stays close for years.
          </p>
          <p>
            Every piece is designed in a small studio and produced in limited runs. We keep our range tight so that we can keep our care high, and price honestly so that the value stays with the garment, not the marketing.
          </p>
          <p>
            We believe the best clothes are ones you barely think about — the piece you reach for again and again because it works. That's the wardrobe we're building.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
