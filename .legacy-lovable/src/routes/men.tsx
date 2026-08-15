import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { products } from "@/data/products";

export const Route = createFileRoute("/men")({
  validateSearch: collectionSearchSchema,
  head: () => ({
    meta: [
      { title: "Men — Jakalburg" },
      { name: "description", content: "Shop men's ready-to-wear from Jakalburg — oxford shirts, chinos, merino polos, denim." },
      { property: "og:title", content: "Men — Jakalburg" },
      { property: "og:url", content: "/men" },
    ],
    links: [{ rel: "canonical", href: "/men" }],
  }),
  component: () => (
    <SiteLayout>
      <CollectionView
        eyebrow="Men"
        title="The men's edit"
        description="Everything for him — considered basics through to outerwear."
        products={products.filter((p) => p.gender === "men")}
        route="/men"
      />
    </SiteLayout>
  ),
});
