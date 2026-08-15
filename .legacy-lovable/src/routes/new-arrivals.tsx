import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { products } from "@/data/products";

export const Route = createFileRoute("/new-arrivals")({
  validateSearch: collectionSearchSchema,
  head: () => ({
    meta: [
      { title: "New arrivals — Jakalburg" },
      { name: "description", content: "The latest pieces from Jakalburg. New arrivals in linen, cotton, denim and knitwear." },
      { property: "og:title", content: "New arrivals — Jakalburg" },
      { property: "og:url", content: "/new-arrivals" },
    ],
    links: [{ rel: "canonical", href: "/new-arrivals" }],
  }),
  component: () => (
    <SiteLayout>
      <CollectionView
        eyebrow="Newest first"
        title="New arrivals"
        description="Pieces newly added to the shop, from summer linens to fine merino knits."
        products={products.filter((p) => p.isNew)}
        route="/new-arrivals"
      />
    </SiteLayout>
  ),
});
