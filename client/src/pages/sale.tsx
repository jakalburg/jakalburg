import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { useProducts } from "@/hooks/useProducts";

export default function SalePage() {
  const { data: products = [], isLoading } = useProducts();
  return (
    <>
      <SEO
        title="Sale — Jakalburg"
        description="Selected pieces at a considered price. Final-sale items are marked."
        canonicalPath="/sale"
      />
      <SiteLayout>
        <CollectionView
          eyebrow="Selected pieces"
          title="Sale"
          description="Considered pieces at a considered price."
          products={products.filter((p) => p.onSale)}
          isLoading={isLoading}
        />
      </SiteLayout>
    </>
  );
}
