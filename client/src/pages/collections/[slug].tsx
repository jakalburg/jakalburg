import type { GetStaticPaths, GetStaticProps } from "next";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { collections, findCollection, type Collection } from "@/data/collections";
import { useProducts } from "@/hooks/useProducts";

export const getStaticPaths: GetStaticPaths = () => ({
  paths: collections.map((c) => ({ params: { slug: c.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ collection: Collection }> = ({ params }) => {
  const collection = findCollection(String(params?.slug));
  if (!collection) return { notFound: true };
  return { props: { collection } };
};

export default function CollectionPage({ collection }: { collection: Collection }) {
  const slug = collection.slug;
  const { data: products = [], isLoading } = useProducts();
  const filtered = products.filter(
    (p) => p.collection === slug || (slug === "essentials" && p.essential),
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
