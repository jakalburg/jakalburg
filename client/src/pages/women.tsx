import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { useProducts } from "@/hooks/useProducts";

export default function WomenPage() {
  const { data: products = [], isLoading } = useProducts();
  return (
    <>
      <SEO
        title="Women — Jakalburg"
        description="Shop women's ready-to-wear from Jakalburg — dresses, shirts, knitwear, trousers."
        canonicalPath="/women"
      />
      <SiteLayout>
        <CollectionView
          eyebrow="Women"
          title="The women's edit"
          description="Everything for her — from bias-cut slip dresses to softly tailored wool trousers."
          products={products.filter((p) => p.gender === "women")}
          isLoading={isLoading}
        />
      </SiteLayout>
    </>
  );
}
