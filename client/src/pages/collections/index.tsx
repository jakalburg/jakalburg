import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { collections } from "@/data/collections";

export default function CollectionsIndex() {
  return (
    <>
      <SEO
        title="Collections — Jakalburg"
        description="Edited collections from Jakalburg — from summer essentials to atelier tailoring."
        canonicalPath="/collections"
      />
      <SiteLayout>
        <section className="container-vh py-10">
          <header className="mb-10">
            <p className="eyebrow text-mute-text">Collections</p>
            <h1 className="mt-2 text-3xl md:text-4xl">Edited by mood.</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Small, focused capsules — grouped by fabric, silhouette, or occasion.
            </p>
          </header>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group block"
              >
                <ImageShimmer
                  src={c.image}
                  alt={c.title}
                  wrapperClassName="aspect-[4/5]"
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                />
                <div className="mt-3">
                  <p className="text-lg font-medium">{c.title}</p>
                  <p className="text-sm text-mute-text">{c.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
