import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/button";

const GRID_CLASS =
  "grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({
  products,
  isLoading,
  skeletonCount = 8,
  paginate = false,
  autoLoadBatches = 2,
  hasMore: hasMoreProp = false,
  isLoadingMore = false,
  onLoadMore,
  total,
  error,
}: {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  /**
   * Hybrid infinite scroll: auto-load `autoLoadBatches` batches as the shopper
   * nears the bottom, then reveal a "Load more" button (clicking it re-arms
   * auto-loading for another `autoLoadBatches`). Opt-in — curated rows (home,
   * related products) leave this off and render everything they're given.
   *
   * Each batch is now a server request rather than a slice of an already-
   * downloaded array; the caller supplies `hasMore`/`onLoadMore` from its
   * infinite query, so `products` only ever holds what has actually loaded.
   */
  paginate?: boolean;
  autoLoadBatches?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  /** Total matching products, for the "Showing X of Y" line. */
  total?: number;
  /** Set when a batch failed, so the grid can offer a retry. */
  error?: unknown;
}) {
  const [autoLoadsUsed, setAutoLoadsUsed] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the auto-load allowance whenever the (server-filtered) list changes,
  // so a new search starts with a fresh couple of automatic batches.
  useEffect(() => {
    setAutoLoadsUsed(0);
  }, [products.length === 0]);

  const hasMore = paginate && hasMoreProp;
  const canAutoLoad = hasMore && !isLoadingMore && autoLoadsUsed < autoLoadBatches;

  // Auto-load the next batch when the sentinel scrolls into view, up to the
  // per-run cap; then hand off to the "Load more" button. `isLoadingMore`
  // gates it so a fast scroll can't request the same page twice.
  useEffect(() => {
    if (!canAutoLoad || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
          setAutoLoadsUsed((n) => n + 1);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canAutoLoad, onLoadMore]);

  if (isLoading) {
    return (
      <div className={GRID_CLASS} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[4/5] w-full bg-stone" />
            <div className="mt-3 h-3 w-2/3 bg-stone" />
            <div className="mt-2 h-3 w-1/3 bg-stone" />
          </div>
        ))}
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-mute-text">
        No products match the current filters.
      </p>
    );
  }

  return (
    <div>
      <div className={GRID_CLASS}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 flex flex-col items-center gap-4">
          {error ? (
            // A failed batch never clears what already loaded — offer a retry.
            <>
              <p className="text-xs text-mute-text">
                Couldn&apos;t load more products.
              </p>
              <Button variant="outline" onClick={onLoadMore}>
                Retry
              </Button>
            </>
          ) : isLoadingMore ? (
            <p className="text-xs text-mute-text">Loading more…</p>
          ) : canAutoLoad ? (
            // Invisible sentinel: crossing it (400px early) fetches the next batch.
            <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
          ) : (
            <>
              <p className="text-xs text-mute-text">
                Showing {products.length} of {total ?? products.length}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onLoadMore?.();
                  setAutoLoadsUsed(0); // re-arm auto-loading for the next run
                }}
              >
                Load more
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
