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
  pageSize = 12,
  autoLoadBatches = 2,
}: {
  products: Product[];
  isLoading?: boolean;
  skeletonCount?: number;
  /**
   * Hybrid infinite scroll: auto-load `autoLoadBatches` batches as the shopper
   * nears the bottom, then reveal a "Load more" button (clicking it re-arms
   * auto-loading for another `autoLoadBatches`). Opt-in — curated rows (home,
   * related products) leave this off and render everything they're given.
   */
  paginate?: boolean;
  pageSize?: number;
  autoLoadBatches?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [autoLoadsUsed, setAutoLoadsUsed] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window whenever the (faceted) list changes — callers memoise the
  // array, so this fires on filter/sort/search changes, not every render.
  useEffect(() => {
    setVisibleCount(pageSize);
    setAutoLoadsUsed(0);
  }, [products, pageSize, paginate]);

  const hasMore = paginate && visibleCount < products.length;
  const canAutoLoad = hasMore && autoLoadsUsed < autoLoadBatches;

  // Auto-load the next batch when the sentinel scrolls into view, up to the
  // per-run cap; then hand off to the "Load more" button.
  useEffect(() => {
    if (!canAutoLoad) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => c + pageSize);
          setAutoLoadsUsed((n) => n + 1);
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canAutoLoad, pageSize]);

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

  const shown = paginate ? products.slice(0, visibleCount) : products;

  return (
    <div>
      <div className={GRID_CLASS}>
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-12 flex flex-col items-center gap-4">
          {canAutoLoad ? (
            // Invisible sentinel: crossing it (400px early) reveals the next batch.
            <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
          ) : (
            <>
              <p className="text-xs text-mute-text">
                Showing {shown.length} of {products.length}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setVisibleCount((c) => c + pageSize);
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
