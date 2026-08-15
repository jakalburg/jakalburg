import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { products } from "@/data/products";

export const Route = createFileRoute("/women")({
  validateSearch: collectionSearchSchema,
  head: () => ({
    meta: [
      { title: "Women — Jakalburg" },
      { name: "description", content: "Shop women's ready-to-wear from Jakalburg — dresses, shirts, knitwear, trousers." },
      { property: "og:title", content: "Women — Jakalburg" },
      { property: "og:url", content: "/women" },
    ],
    links: [{ rel: "canonical", href: "/women" }],
  }),
  component: () => (
    <SiteLayout>
      <CollectionView
        eyebrow="Women"
        title="The women's edit"
        description="Everything for her — from bias-cut slip dresses to softly tailored wool trousers."
        products={products.filter((p) => p.gender === "women")}
        route="/women"
      />
    </SiteLayout>
  ),
});
