import { useRouter } from "next/router";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { products } from "@/data/products";

export default function SearchPage() {
  const router = useRouter();
  const q = typeof router.query.q === "string" ? router.query.q : "";
  const term = q.trim().toLowerCase();
  const results = term
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.category.includes(term) ||
          p.tags.some((t) => t.includes(term)),
      )
    : [];
  return (
    <>
      <SEO title="Search — Jakalburg" description="Search Jakalburg." noIndex />
      <SiteLayout>
        <section className="container-vh py-10">
          <p className="eyebrow text-mute-text">Search</p>
          <h1 className="mt-2 text-3xl">
            {term ? `Results for "${term}"` : "Search"}
          </h1>
          <p className="mt-2 mb-8 text-sm text-mute-text">
            {term ? `${results.length} pieces found` : "Use the search icon in the header to look up styles."}
          </p>
          <ProductGrid products={results} />
        </section>
      </SiteLayout>
    </>
  );
}
