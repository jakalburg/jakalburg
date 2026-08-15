import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { heroImages } from "@/data/images";

export default function AboutPage() {
  return (
    <>
      <SEO
        title="About — Jakalburg"
        description="The story behind Jakalburg — considered ready-to-wear built to be kept."
        image={heroImages.about}
        canonicalPath="/about"
      />
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
              We believe the best clothes are ones you barely think about — the piece you reach for again and again because it works. That&apos;s the wardrobe we&apos;re building.
            </p>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
