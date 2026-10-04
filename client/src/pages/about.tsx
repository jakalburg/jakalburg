import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { heroImages } from "@/data/images";
import {
  AboutPageContent,
  fetchAboutPage,
  useAboutPage,
} from "@/hooks/useAboutPage";
import { StaticPage, fetchStaticPage, useStaticPage } from "@/hooks/useStaticPage";

const SLUG = "about";

// The About page is composed from two editors:
//   Website → Static Pages ("about")  → heading + body copy
//   Website → About Page tab          → hero image + eyebrow (it has the
//                                        image uploader; rich text can't carry
//                                        a full-bleed hero)
const FALLBACK_EYEBROW = "Our story";
const FALLBACK_TITLE = "A small studio, patient work.";
const FALLBACK_BODY = [
  "<p>Jakalburg is a considered ready-to-wear label. We work with a small palette of natural fibres — long-staple cottons, European linens, fine merino and Japanese denim — and cut them into a wardrobe that stays close for years.</p>",
  "<p>Every piece is designed in a small studio and produced in limited runs. We keep our range tight so that we can keep our care high, and price honestly so that the value stays with the garment, not the marketing.</p>",
  "<p>We believe the best clothes are ones you barely think about — the piece you reach for again and again because it works. That&rsquo;s the wardrobe we&rsquo;re building.</p>",
].join("");

export async function getStaticProps() {
  const [initialPage, initialAbout] = await Promise.all([
    fetchStaticPage(SLUG),
    fetchAboutPage(),
  ]);
  return { props: { initialPage, initialAbout }, revalidate: 60 };
}

export default function AboutPage({
  initialPage,
  initialAbout,
}: {
  initialPage: StaticPage | null;
  initialAbout: AboutPageContent | null;
}) {
  const { data: page } = useStaticPage(SLUG, initialPage ?? undefined);
  const { data: about } = useAboutPage(initialAbout ?? undefined);

  const eyebrow = about?.subtitle?.trim() || FALLBACK_EYEBROW;
  const hero = about?.imageMain?.trim() || heroImages.about;
  const title = page?.title?.trim() || FALLBACK_TITLE;
  const body = page?.content?.trim() || FALLBACK_BODY;

  return (
    <>
      <SEO
        title="About — Jakalburg"
        description="The story behind Jakalburg — considered ready-to-wear built to be kept."
        image={hero}
        canonicalPath="/about"
      />
      <SiteLayout>
        <section>
          <ImageShimmer
            src={hero}
            alt="Jakalburg studio"
            wrapperClassName="h-[50vh] w-full"
            className="object-cover"
            loading="eager"
          />
        </section>
        <section className="container-vh grid gap-10 py-16 md:grid-cols-2">
          <div>
            <p className="eyebrow text-mute-text">{eyebrow}</p>
            <h1 className="mt-3 text-3xl md:text-4xl">{title}</h1>
          </div>
          <div
            className="prose max-w-none space-y-6 text-sm text-muted-foreground md:text-base"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </section>
      </SiteLayout>
    </>
  );
}
