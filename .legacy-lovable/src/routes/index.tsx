import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { products } from "@/data/products";
import { collections } from "@/data/collections";
import { heroImages } from "@/data/images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Jakalburg — Considered wardrobe essentials" },
      {
        name: "description",
        content:
          "Linen, cotton, wool and denim pieces built to last. Shop the new season, essentials, and edited collections.",
      },
      { property: "og:title", content: "Jakalburg — Considered wardrobe essentials" },
      { property: "og:description", content: "Considered pieces in natural fibres, made to be kept." },
      { property: "og:image", content: heroImages.primary },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const newIn = products.filter((p) => p.isNew).slice(0, 4);
  const essentials = products.filter((p) => p.essential).slice(0, 4);

  return (
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
              <Button asChild size="lg"><Link to="/new-arrivals">Shop new arrivals</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/collections">Explore collections</Link></Button>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <img src={heroImages.primary} alt="Model wearing Jakalburg linen shirt and wide-leg trouser" className="h-[70vh] w-full object-cover md:h-full" />
          </div>
        </div>
      </section>

      <section className="container-vh py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow text-mute-text">New arrivals</p>
            <h2 className="mt-2 text-2xl md:text-3xl">Just arrived</h2>
          </div>
          <Link to="/new-arrivals" className="text-sm underline underline-offset-4">See all</Link>
        </div>
        <ProductGrid products={newIn} />
      </section>

      <section className="container-vh py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow text-mute-text">Collections</p>
            <h2 className="mt-2 text-2xl md:text-3xl">Shop by mood</h2>
          </div>
          <Link to="/collections" className="text-sm underline underline-offset-4">All collections</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {collections.slice(0, 3).map((c) => (
            <Link key={c.slug} to="/collections/$slug" params={{ slug: c.slug }} className="group block">
              <div className="aspect-[4/5] overflow-hidden bg-stone">
                <img
                  src={c.image}
                  alt={c.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
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
          <img src={heroImages.editorial} alt="Jakalburg editorial: cotton and wool essentials" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          <div>
            <p className="eyebrow text-mute-text">The Essentials</p>
            <h2 className="mt-3 text-2xl md:text-3xl">Foundational pieces you'll reach for daily.</h2>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Tees, tanks, polos, shirts and knits — cut from long-staple cottons and fine merino, in a small, considered palette.
            </p>
            <Button asChild className="mt-6" variant="outline"><Link to="/essentials">Shop essentials</Link></Button>
          </div>
        </div>
      </section>

      <section className="container-vh py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="eyebrow text-mute-text">Essentials</p>
            <h2 className="mt-2 text-2xl md:text-3xl">The everyday edit</h2>
          </div>
          <Link to="/essentials" className="text-sm underline underline-offset-4">Shop all</Link>
        </div>
        <ProductGrid products={essentials} />
      </section>
    </SiteLayout>
  );
}
