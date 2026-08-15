import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { products } from "@/data/products";

export const Route = createFileRoute("/sale")({
  validateSearch: collectionSearchSchema,
  head: () => ({
    meta: [
      { title: "Sale — Jakalburg" },
      { name: "description", content: "Selected pieces at a considered price. Final-sale items are marked." },
      { property: "og:title", content: "Sale — Jakalburg" },
      { property: "og:url", content: "/sale" },
    ],
    links: [{ rel: "canonical", href: "/sale" }],
  }),
  component: () => (
    <SiteLayout>
      <CollectionView
        eyebrow="Selected pieces"
        title="Sale"
        description="Considered pieces at a considered price."
        products={products.filter((p) => p.onSale)}
        route="/sale"
      />
    </SiteLayout>
  ),
});
