import type { GetStaticPaths, GetStaticProps } from "next";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { collections as staticCollections, findCollection } from "@/data/collections";
import {
  fetchEnabledCollections,
  toDisplayCollection,
  type CollectionDisplay,
} from "@/hooks/useCollections";
import { useProducts } from "@/hooks/useProducts";

// Paths come from the live (enabled) collections so admin-created ones get pages
// too; `fallback: "blocking"` builds any new slug on first request. If the
// backend is unreachable at build, fall back to the shipped slugs.
export const getStaticPaths: GetStaticPaths = async () => {
  let slugs: string[];
  try {
    slugs = (await fetchEnabledCollections()).map((c) => c.slug);
  } catch {
    slugs = staticCollections.map((c) => c.slug);
  }
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<{
  collection: CollectionDisplay;
}> = async ({ params }) => {
  const slug = String(params?.slug);

  let list: CollectionDisplay[] | null = null;
  try {
    list = (await fetchEnabledCollections()).map(toDisplayCollection);
  } catch {
    list = null; // backend down — fall back to shipped static data below
  }

  let collection: CollectionDisplay | undefined;
  if (list) {
    // Backend reachable: only enabled collections exist → a missing slug 404s
    // (respects an admin disabling/deleting a collection).
    collection = list.find((c) => c.slug === slug);
  } else {
    const s = findCollection(slug);
    collection = s
      ? {
          slug: s.slug,
          title: s.title,
          subtitle: s.tagline,
          description: s.description,
          image: s.image,
        }
      : undefined;
  }

  if (!collection) return { notFound: true, revalidate: 60 };
  return { props: { collection }, revalidate: 60 };
};

export default function CollectionPage({
  collection,
}: {
  collection: CollectionDisplay;
}) {
  const slug = collection.slug;
  const { data: products = [], isLoading } = useProducts();
  const filtered = products.filter(
    (p) =>
      p.collections?.includes(slug) ||
      p.collection === slug ||
      (slug === "essentials" && p.essential),
  );
  return (
    <>
      <SEO
        title={`${collection.title} — Jakalburg`}
        description={collection.description}
        image={collection.image}
        canonicalPath={`/collections/${collection.slug}`}
      />
      <SiteLayout>
        <div className="bg-stone">
          <div className="container-vh grid gap-6 py-14 md:grid-cols-2 md:items-center">
            <div>
              <p className="eyebrow text-mute-text">Collection</p>
              <h1 className="mt-2 text-3xl md:text-4xl">{collection.title}</h1>
              <p className="mt-3 max-w-md text-sm text-muted-foreground">{collection.description}</p>
            </div>
            <ImageShimmer
              src={collection.image}
              alt={collection.title}
              wrapperClassName="aspect-[4/3] w-full"
              className="object-cover"
              loading="eager"
            />
          </div>
        </div>
        <CollectionView
          title={collection.title}
          products={filtered}
          isLoading={isLoading}
        />
      </SiteLayout>
    </>
  );
}
