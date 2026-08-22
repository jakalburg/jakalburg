import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useProducts } from "@/hooks/useProducts";
import { collections } from "@/data/collections";
import { heroImages } from "@/data/images";

export default function HomePage() {
  const { data: products = [], isLoading } = useProducts();
  const newIn = products.filter((p) => p.isNew).slice(0, 4);
  const essentials = products.filter((p) => p.essential).slice(0, 4);

  return (
    <>
      <SEO
        title="Jakalburg — Considered wardrobe essentials"
        description="Linen, cotton, wool and denim pieces built to last. Shop the new season, essentials, and edited collections."
        image={heroImages.primary}
        canonicalPath="/"
      />
      <SiteLayout>
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
              <ImageShimmer
                src={heroImages.primary}
                alt="Model wearing Jakalburg linen shirt and wide-leg trouser"
                wrapperClassName="h-[70vh] w-full md:h-full"
                className="object-cover"
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="container-vh py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="eyebrow text-mute-text">New arrivals</p>
              <h2 className="mt-2 text-2xl md:text-3xl">Just arrived</h2>
            </div>
            <Link href="/new-arrivals" className="text-sm underline underline-offset-4">See all</Link>
          </div>
          <ProductGrid products={newIn} isLoading={isLoading} skeletonCount={4} />
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
            {collections.slice(0, 3).map((c) => (
              <Link key={c.slug} href={`/collections/${c.slug}`} className="group block">
                <ImageShimmer
                  src={c.image}
                  alt={c.title}
                  wrapperClassName="aspect-[4/5]"
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                />
                <div className="mt-3">
                  <p className="text-base font-medium">{c.title}</p>
                  <p className="text-xs text-mute-text">{c.tagline}</p>
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
          <ProductGrid products={essentials} isLoading={isLoading} skeletonCount={4} />
        </section>
      </SiteLayout>
    </>
  );
}
