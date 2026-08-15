import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { products } from "@/data/products";

export default function EssentialsPage() {
  return (
    <>
      <SEO
        title="Essentials — Jakalburg"
        description="The Essentials — foundational pieces to wear every day."
        canonicalPath="/essentials"
      />
      <SiteLayout>
        <CollectionView
          eyebrow="The Essentials"
          title="Foundational pieces, every day."
          description="Tees, polos, shirts and knits — foundational layers cut from long-staple cottons and fine merino."
          products={products.filter((p) => p.essential)}
        />
      </SiteLayout>
    </>
  );
}
