import type { GetStaticPaths, GetStaticProps } from "next";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { allCategories, findCategory, type Category } from "@/data/categories";

export const getStaticPaths: GetStaticPaths = () => ({
  paths: allCategories.map((c) => ({ params: { slug: c.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ category: Category }> = ({ params }) => {
  const category = findCategory(String(params?.slug));
  if (!category) return { notFound: true };
  return { props: { category } };
};

export default function CategoryPage({ category }: { category: Category }) {
  const label = `${category.title} — ${category.gender === "women" ? "Women" : "Men"}`;
  return (
    <>
      <SEO
        title={`${label} — Jakalburg`}
        description={`Shop ${label.toLowerCase()} at Jakalburg.`}
        canonicalPath={`/category/${category.slug}`}
      />
      <SiteLayout>
        <CollectionView
          eyebrow={category.gender === "women" ? "Women" : "Men"}
          title={category.title}
          filters={{
            category: category.category,
            // "all" means both genders — leave the filter off entirely.
            gender: category.gender === "all" ? undefined : category.gender,
          }}
        />
      </SiteLayout>
    </>
  );
}
