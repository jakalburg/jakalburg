import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { collectionSearchSchema } from "@/lib/searchParams";
import { findCategory } from "@/data/categories";
import { products } from "@/data/products";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: collectionSearchSchema,
  loader: ({ params }) => {
    const category = findCategory(params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Category not found — Jakalburg" }, { name: "robots", content: "noindex" }] };
    }
    const { category } = loaderData;
    const label = `${category.title} — ${category.gender === "women" ? "Women" : "Men"}`;
    return {
      meta: [
        { title: `${label} — Jakalburg` },
        { name: "description", content: `Shop ${label.toLowerCase()} at Jakalburg.` },
        { property: "og:title", content: `${label} — Jakalburg` },
        { property: "og:url", content: `/category/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/category/${params.slug}` }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const list = products.filter(
    (p) => p.category === category.category && (category.gender === "all" || p.gender === category.gender),
  );
  return (
    <SiteLayout>
      <CollectionView
        eyebrow={category.gender === "women" ? "Women" : "Men"}
        title={category.title}
        products={list}
        route="/category/$slug"
        params={{ slug: category.slug }}
      />
    </SiteLayout>
  );
}
