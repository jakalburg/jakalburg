import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { findCollection } from "@/data/collections";
import { products } from "@/data/products";

export const Route = createFileRoute("/collections/$slug")({
  validateSearch: collectionSearchSchema,
  loader: ({ params }) => {
    const collection = findCollection(params.slug);
    if (!collection) throw notFound();
    return { collection };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Collection not found — Jakalburg" }, { name: "robots", content: "noindex" }],
      };
    }
    const { collection } = loaderData;
    return {
      meta: [
        { title: `${collection.title} — Jakalburg` },
        { name: "description", content: collection.description },
        { property: "og:title", content: `${collection.title} — Jakalburg` },
        { property: "og:description", content: collection.description },
        { property: "og:image", content: collection.image },
        { property: "og:url", content: `/collections/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/collections/${params.slug}` }],
    };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { collection } = Route.useLoaderData();
  const slug = collection.slug;
  const filtered = products.filter(
    (p) => p.collection === slug || (slug === "essentials" && p.essential),
  );
  return (
    <SiteLayout>
      <div className="bg-stone">
        <div className="container-vh grid gap-6 py-14 md:grid-cols-2 md:items-center">
          <div>
            <p className="eyebrow text-mute-text">Collection</p>
            <h1 className="mt-2 text-3xl md:text-4xl">{collection.title}</h1>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">{collection.description}</p>
          </div>
          <img
            src={collection.image}
            alt={collection.title}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </div>
      <CollectionView
        title={collection.title}
        products={filtered}
        route="/collections/$slug"
        params={{ slug }}
      />
    </SiteLayout>
  );
}
