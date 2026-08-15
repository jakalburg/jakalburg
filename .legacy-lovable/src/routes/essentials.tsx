import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { products } from "@/data/products";

export const Route = createFileRoute("/essentials")({
  validateSearch: collectionSearchSchema,
  head: () => ({
    meta: [
      { title: "Essentials — Jakalburg" },
      { name: "description", content: "The Essentials — foundational pieces to wear every day." },
      { property: "og:title", content: "Essentials — Jakalburg" },
      { property: "og:url", content: "/essentials" },
    ],
    links: [{ rel: "canonical", href: "/essentials" }],
  }),
  component: () => (
    <SiteLayout>
      <CollectionView
        eyebrow="The Essentials"
        title="Foundational pieces, every day."
        description="Tees, polos, shirts and knits — foundational layers cut from long-staple cottons and fine merino."
        products={products.filter((p) => p.essential)}
        route="/essentials"
      />
    </SiteLayout>
  ),
});
