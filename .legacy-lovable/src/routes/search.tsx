import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { products } from "@/data/products";

const searchSchema = z.object({ q: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search — Jakalburg" },
      { name: "description", content: "Search Jakalburg." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const term = (q ?? "").trim().toLowerCase();
  const results = term
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.category.includes(term) ||
          p.tags.some((t) => t.includes(term)),
      )
    : [];
  return (
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
  );
}
