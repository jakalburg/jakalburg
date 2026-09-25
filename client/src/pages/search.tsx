import { useRouter } from "next/router";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useProductsInfinite } from "@/hooks/useProducts";

export default function SearchPage() {
  const router = useRouter();
  const q = typeof router.query.q === "string" ? router.query.q : "";
  const term = q.trim();

  // The search runs in the database and comes back a page at a time — the
  // catalogue is never pulled down to be filtered here.
  const {
    products: results,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useProductsInfinite(
    { search: term || undefined },
    // Nothing to search for yet — don't request the unfiltered catalogue.
    { enabled: Boolean(term) },
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
                : `${total} ${total === 1 ? "piece" : "pieces"} found`
              : "Use the search icon in the header to look up styles."}
          </p>
          <ProductGrid
            products={term ? results : []}
            isLoading={term ? isLoading : false}
            paginate
            hasMore={Boolean(term && hasNextPage)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            total={total}
            error={error}
          />
        </section>
      </SiteLayout>
    </>
  );
}
