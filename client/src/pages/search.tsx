import { useMemo } from "react";
import { useRouter } from "next/router";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useProducts } from "@/hooks/useProducts";

export default function SearchPage() {
  const router = useRouter();
  const { data: products = [], isLoading } = useProducts();
  const q = typeof router.query.q === "string" ? router.query.q : "";
  const term = q.trim().toLowerCase();
  // Memoised so ProductGrid's infinite-scroll window only resets when the
  // results actually change, not on every render.
  const results = useMemo(
    () =>
      term
        ? products.filter(
            (p) =>
              p.title.toLowerCase().includes(term) ||
              p.category.includes(term) ||
              p.tags.some((t) => t.includes(term)),
          )
        : [],
    [products, term],
  );
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
            {term
              ? isLoading
                ? "Searching…"
                : `${results.length} pieces found`
              : "Use the search icon in the header to look up styles."}
          </p>
          <ProductGrid
            products={results}
            isLoading={term ? isLoading : false}
            paginate
          />
        </section>
      </SiteLayout>
    </>
  );
}
