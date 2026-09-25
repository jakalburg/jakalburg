import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";

export default function NewArrivalsPage() {
  return (
    <>
      <SEO
        title="New arrivals — Jakalburg"
        description="The latest pieces from Jakalburg. New arrivals in linen, cotton, denim and knitwear."
        canonicalPath="/new-arrivals"
      />
      <SiteLayout>
        <CollectionView
          eyebrow="Newest first"
          title="New arrivals"
          description="Pieces newly added to the shop, from summer linens to fine merino knits."
          filters={{ isNew: true }}
        />
      </SiteLayout>
    </>
  );
}
