import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { WishlistCard } from "@/components/product/WishlistCard";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectWishlistIds, reset_wishlist } from "@/redux/features/wishlist-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { useProductsInfinite } from "@/hooks/useProducts";

export default function WishlistPage() {
  const hydrated = useHydrated();
  const dispatch = useAppDispatch();
  const ids = useAppSelector(selectWishlistIds);

  // Fetch exactly the saved products, a page at a time, instead of pulling the
  // catalogue and picking them out of it.
  const {
    products,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useProductsInfinite(
    { ids },
    { enabled: hydrated && ids.length > 0 },
  );

  // Restore the saved order (the API sorts by its own rules) and drop ids that
  // are no longer in the catalogue.
  const byId = new Map(products.map((p) => [p.id, p]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <>
      <SEO title="Wishlist — Jakalburg" description="Pieces you've saved for later." noIndex />
      <SiteLayout>
        <section className="container-vh py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-mute-text">Wishlist</p>
              <h1 className="mt-2 text-3xl">Saved for later</h1>
            </div>
            {hydrated && items.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => dispatch(reset_wishlist())}>
                Clear wishlist
              </Button>
            )}
          </div>

          {hydrated && ids.length > 0 && isLoading && (
            <div className="mt-10"><ProductGrid products={[]} isLoading skeletonCount={ids.length} /></div>
          )}
          {hydrated && !isLoading && items.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-mute-text">You haven&apos;t saved anything yet.</p>
              <Button asChild><Link href="/new-arrivals">Start browsing</Link></Button>
            </div>
          )}
          {hydrated && items.length > 0 && (
            <>
              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <WishlistCard key={p.id} product={p} />
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-xs text-mute-text">
                    Showing {items.length} of {ids.length}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </SiteLayout>
    </>
  );
}
