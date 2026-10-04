import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useProductsPage } from "@/hooks/useProducts";
import type { HeroSlide } from "@/hooks/useHeroSlides";
import {
  fetchHomeSections,
  useHomeSections,
  type EssentialsFeatureData,
  type HomeSection,
} from "@/hooks/useHomeSections";
import {
  useCollections,
  fetchEnabledCollections,
  resolveCollections,
  type ApiCollection,
} from "@/hooks/useCollections";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { heroImages } from "@/data/images";
import type { Product } from "@/types";

/** Products shown in each curated row on the home page. */
const HOME_ROW_SIZE = 4;

/**
 * What the page renders when the backend is unreachable — the section list as
 * it ships, so a down API degrades to the original hardcoded home page rather
 * than a blank one. Ids are inert; nothing looks them up.
 */
const FALLBACK_SECTIONS: HomeSection[] = [
  { id: "fallback-hero", type: "HeroSlider", order: 1 },
  {
    id: "fallback-just-arrived",
    type: "JustArrived",
    eyebrow: "New arrivals",
    title: "Just arrived",
    order: 2,
  },
  {
    id: "fallback-shop-by-mood",
    type: "ShopByMood",
    eyebrow: "Collections",
    title: "Shop by mood",
    order: 3,
  },
  {
    id: "fallback-essentials-feature",
    type: "EssentialsFeature",
    eyebrow: "The Essentials",
    title: "Foundational pieces you'll reach for daily.",
    order: 4,
  },
  {
    id: "fallback-everyday-edit",
    type: "EverydayEdit",
    eyebrow: "Essentials",
    title: "The everyday edit",
    order: 5,
  },
];

/** The editorial band's copy when the admin hasn't set its own. */
const ESSENTIALS_FEATURE_FALLBACK: Required<EssentialsFeatureData> = {
  image: heroImages.editorial,
  body: "Tees, tanks, polos, shirts and knits — cut from long-staple cottons and fine merino, in a small, considered palette.",
  buttonLabel: "Shop essentials",
  buttonLink: "/essentials",
};

// Fetch the page's own configuration at build/revalidation so the very first
// paint is already the admin's layout — without this the sections would
// reflow as the client fetch resolves (a full-bleed hero would flash the
// split layout, a disabled section would appear then vanish). Resilient to a
// down backend: each falls back to null and the client query fills in.
export async function getStaticProps() {
  let initialSections: HomeSection[] | null = null;
  try {
    initialSections = await fetchHomeSections();
  } catch {
    initialSections = null;
  }
  let initialCollections: ApiCollection[] | null = null;
  try {
    initialCollections = await fetchEnabledCollections();
  } catch {
    initialCollections = null;
  }
  return { props: { initialSections, initialCollections }, revalidate: 60 };
}

/** A curated product row: eyebrow + heading on the left, "see all" on the right. */
function ProductRowSection({
  section,
  products,
  isLoading,
  href,
  linkLabel,
}: {
  section: HomeSection;
  products: Product[];
  isLoading: boolean;
  href: string;
  linkLabel: string;
}) {
  return (
    <section className={sectionPadding(section, "container-vh")}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          {section.eyebrow ? (
            <p className="eyebrow text-mute-text">{section.eyebrow}</p>
          ) : null}
          {section.title ? (
            <h2 className="mt-2 text-2xl md:text-3xl">{section.title}</h2>
          ) : null}
        </div>
        <Link href={href} className="text-sm underline underline-offset-4">
          {linkLabel}
        </Link>
      </div>
      <ProductGrid
        products={products}
        isLoading={isLoading}
        skeletonCount={HOME_ROW_SIZE}
      />
    </section>
  );
}

/**
 * Vertical padding from the section's own PT/PB toggles. Both default to on —
 * an older row with the column unset reads as `null`, which must not collapse
 * the spacing.
 */
function sectionPadding(section: HomeSection, ...extra: string[]) {
  return [
    ...extra,
    section.paddingTop === false ? "pt-0" : "pt-16",
    section.paddingBottom === false ? "pb-0" : "pb-16",
  ].join(" ");
}

export default function HomePage({
  initialSections,
  initialCollections,
}: {
  initialSections: HomeSection[] | null;
  initialCollections: ApiCollection[] | null;
}) {
  // Two curated rows of 4 — each asks the API for exactly those 4 rather than
  // pulling the catalogue down to slice it.
  const { data: newInPage, isLoading: newInLoading } = useProductsPage({
    isNew: true,
    limit: HOME_ROW_SIZE,
  });
  const { data: essentialsPage, isLoading: essentialsLoading } =
    useProductsPage({ essential: true, limit: HOME_ROW_SIZE });
  const { sections: liveSections } = useHomeSections(
    initialSections ?? undefined,
  );
  const { data: collectionsData } = useCollections(
    initialCollections ?? undefined,
  );

  // An empty list means the API never answered — render the shipped layout
  // rather than an empty page. An admin who disables every section still gets
  // an empty page, which is what they asked for.
  const sections = liveSections.length > 0 ? liveSections : FALLBACK_SECTIONS;

  const moodCollections = resolveCollections(collectionsData).slice(0, 3);
  const newIn = newInPage?.data ?? [];
  const essentials = essentialsPage?.data ?? [];

  const renderSection = (section: HomeSection) => {
    switch (section.type) {
      case "HeroSlider": {
        const slides = (Array.isArray(section.data) ? section.data : []) as HeroSlide[];
        return (
          <HeroSection
            key={section.id}
            fullBleed={!!section.fullBleed}
            slides={slides}
          />
        );
      }

      case "JustArrived":
        return (
          <ProductRowSection
            key={section.id}
            section={section}
            products={newIn}
            isLoading={newInLoading}
            href="/new-arrivals"
            linkLabel="See all"
          />
        );

      case "ShopByMood":
        return (
          <section key={section.id} className={sectionPadding(section, "container-vh")}>
            <div className="mb-8 flex items-end justify-between">
              <div>
                {section.eyebrow ? (
                  <p className="eyebrow text-mute-text">{section.eyebrow}</p>
                ) : null}
                {section.title ? (
                  <h2 className="mt-2 text-2xl md:text-3xl">{section.title}</h2>
                ) : null}
              </div>
              <Link href="/collections" className="text-sm underline underline-offset-4">
                All collections
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {moodCollections.map((c) => (
                <Link key={c.slug} href={`/collections/${c.slug}`} className="group block">
                  <ImageShimmer
                    src={c.image}
                    alt={c.title}
                    wrapperClassName="aspect-[4/5]"
                    className="object-cover transition duration-700 group-hover:scale-[1.02]"
                  />
                  <div className="mt-3">
                    <p className="text-base font-medium">{c.title}</p>
                    {c.subtitle ? (
                      <p className="text-xs text-mute-text">{c.subtitle}</p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );

      case "EssentialsFeature": {
        const data = (section.data ?? {}) as EssentialsFeatureData;
        const image = data.image || ESSENTIALS_FEATURE_FALLBACK.image;
        const body = data.body || ESSENTIALS_FEATURE_FALLBACK.body;
        const buttonLabel =
          data.buttonLabel || ESSENTIALS_FEATURE_FALLBACK.buttonLabel;
        const buttonLink =
          data.buttonLink || ESSENTIALS_FEATURE_FALLBACK.buttonLink;
        return (
          <section key={section.id} className="bg-stone">
            <div
              className={sectionPadding(
                section,
                "container-vh grid gap-8 md:grid-cols-2 md:items-center",
              )}
            >
              <ImageShimmer
                src={image}
                alt={section.title || "Jakalburg editorial"}
                wrapperClassName="aspect-[4/5] w-full"
                className="object-cover"
              />
              <div>
                {section.eyebrow ? (
                  <p className="eyebrow text-mute-text">{section.eyebrow}</p>
                ) : null}
                {section.title ? (
                  <h2 className="mt-3 text-2xl md:text-3xl">{section.title}</h2>
                ) : null}
                <p className="mt-4 max-w-md text-sm text-muted-foreground">{body}</p>
                {buttonLabel ? (
                  <Button asChild className="mt-6" variant="outline">
                    <Link href={buttonLink}>{buttonLabel}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        );
      }

      case "EverydayEdit":
        return (
          <ProductRowSection
            key={section.id}
            section={section}
            products={essentials}
            isLoading={essentialsLoading}
            href="/essentials"
            linkLabel="Shop all"
          />
        );

      // "AnnouncementBar" and "Footer" come down this list too. Neither is a
      // home-page block: both are rendered by SiteLayout on every page and
      // read their own row straight from this same query.
      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Jakalburg — Considered wardrobe essentials"
        description="Linen, cotton, wool and denim pieces built to last. Shop the new season, essentials, and edited collections."
        image={heroImages.primary}
        canonicalPath="/"
      />
      <SiteLayout>{sections.map(renderSection)}</SiteLayout>
    </>
  );
}

/** The hero: an edge-to-edge photo carousel, or the split text+image layout. */
function HeroSection({
  fullBleed,
  slides,
}: {
  fullBleed: boolean;
  slides: HeroSlide[];
}) {
  if (fullBleed && slides.length > 0) {
    // Full-photo hero: the slide fills the hero edge-to-edge.
    return <HeroCarousel slides={slides} />;
  }

  // Split hero: fixed headline + buttons on the left, the admin's slide images
  // (a carousel) on the right — or the static image when none are configured.
  return (
    <section className="relative">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-6 py-16 md:order-1 md:px-16 md:py-24">
          <p className="eyebrow text-mute-text">Spring / Summer</p>
          <h1 className="mt-4 text-4xl leading-[1.05] md:text-6xl">
            The considered<br />wardrobe.
          </h1>
          <p className="mt-6 max-w-md text-sm text-muted-foreground md:text-base">
            A capsule of pieces in natural fibres — designed to layer, made to be kept, sized for real bodies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/new-arrivals">Shop new arrivals</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/collections">Explore collections</Link></Button>
          </div>
        </div>
        <div className="order-1 md:order-2">
          {slides.length > 0 ? (
            <HeroCarousel slides={slides} />
          ) : (
            <ImageShimmer
              src={heroImages.primary}
              alt="Model wearing Jakalburg linen shirt and wide-leg trouser"
              wrapperClassName="h-[70vh] w-full md:h-full"
              className="object-cover"
              loading="eager"
            />
          )}
        </div>
      </div>
    </section>
  );
}
