import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useProductsPage } from "@/hooks/useProducts";
import { useHeroSlides, type HeroConfig } from "@/hooks/useHeroSlides";
import {
  useCollections,
  fetchEnabledCollections,
  resolveCollections,
  type ApiCollection,
} from "@/hooks/useCollections";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { heroImages } from "@/data/images";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/** Products shown in each curated row on the home page. */
const HOME_ROW_SIZE = 4;

// Fetch the hero config at build/revalidation so the very first paint already
// knows `fullBleed` — without this, a full-bleed hero briefly renders the split
// layout (the default) before the client fetch resolves. Resilient to a down
// backend: falls back to null and lets the client query fill in.
export async function getStaticProps() {
  let initialHeroConfig: HeroConfig | null = null;
  try {
    initialHeroConfig = await apiFetch<HeroConfig>(API_ENDPOINTS.website.hero);
  } catch {
    initialHeroConfig = null;
  }
  let initialCollections: ApiCollection[] | null = null;
  try {
    initialCollections = await fetchEnabledCollections();
  } catch {
    initialCollections = null;
  }
  return { props: { initialHeroConfig, initialCollections }, revalidate: 60 };
}

export default function HomePage({
  initialHeroConfig,
  initialCollections,
}: {
  initialHeroConfig: HeroConfig | null;
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
  const { data: heroConfig } = useHeroSlides(initialHeroConfig ?? undefined);
  const { data: collectionsData } = useCollections(
    initialCollections ?? undefined,
  );
  const moodCollections = resolveCollections(collectionsData).slice(0, 3);
  const heroSlides = heroConfig?.slides ?? [];
  const heroFullBleed = heroConfig?.fullBleed ?? false;
  const newIn = newInPage?.data ?? [];
  const essentials = essentialsPage?.data ?? [];

  return (
    <>
      <SEO
        title="Jakalburg — Considered wardrobe essentials"
        description="Linen, cotton, wool and denim pieces built to last. Shop the new season, essentials, and edited collections."
        image={heroImages.primary}
        canonicalPath="/"
      />
      <SiteLayout>
        {heroFullBleed && heroSlides.length > 0 ? (
          // Full-photo hero: the slide fills the hero edge-to-edge.
          <HeroCarousel slides={heroSlides} />
        ) : (
          // Split hero: fixed headline + buttons on the left, the admin's slide
          // images (a carousel) on the right — or the static image when the
          // hero has no slides configured.
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
                {heroSlides.length > 0 ? (
                  <HeroCarousel slides={heroSlides} />
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
        )}

        <section className="container-vh py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow text-mute-text">New arrivals</p>
              <h2 className="mt-2 text-2xl md:text-3xl">Just arrived</h2>
            </div>
            <Link href="/new-arrivals" className="text-sm underline underline-offset-4">See all</Link>
          </div>
          <ProductGrid products={newIn} isLoading={newInLoading} skeletonCount={HOME_ROW_SIZE} />
        </section>

        <section className="container-vh py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow text-mute-text">Collections</p>
              <h2 className="mt-2 text-2xl md:text-3xl">Shop by mood</h2>
            </div>
            <Link href="/collections" className="text-sm underline underline-offset-4">All collections</Link>
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

        <section className="bg-stone">
          <div className="container-vh grid gap-8 py-16 md:grid-cols-2 md:items-center">
            <ImageShimmer
              src={heroImages.editorial}
              alt="Jakalburg editorial: cotton and wool essentials"
              wrapperClassName="aspect-[4/5] w-full"
              className="object-cover"
            />
            <div>
              <p className="eyebrow text-mute-text">The Essentials</p>
              <h2 className="mt-3 text-2xl md:text-3xl">Foundational pieces you&apos;ll reach for daily.</h2>
              <p className="mt-4 max-w-md text-sm text-muted-foreground">
                Tees, tanks, polos, shirts and knits — cut from long-staple cottons and fine merino, in a small, considered palette.
              </p>
              <Button asChild className="mt-6" variant="outline"><Link href="/essentials">Shop essentials</Link></Button>
            </div>
          </div>
        </section>

        <section className="container-vh py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow text-mute-text">Essentials</p>
              <h2 className="mt-2 text-2xl md:text-3xl">The everyday edit</h2>
            </div>
            <Link href="/essentials" className="text-sm underline underline-offset-4">Shop all</Link>
          </div>
          <ProductGrid products={essentials} isLoading={essentialsLoading} skeletonCount={HOME_ROW_SIZE} />
        </section>
      </SiteLayout>
    </>
  );
}
