import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";

export default function MenPage() {
  return (
    <>
      <SEO
        title="Men — Jakalburg"
        description="Shop men's ready-to-wear from Jakalburg — oxford shirts, chinos, merino polos, denim."
        canonicalPath="/men"
      />
      <SiteLayout>
        <CollectionView
          eyebrow="Men"
          title="The men's edit"
          description="Everything for him — considered basics through to outerwear."
          filters={{ gender: "men" }}
        />
      </SiteLayout>
    </>
  );
}
