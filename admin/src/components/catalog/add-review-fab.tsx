"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { productsService } from "@/services/products.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  AddReviewDialog,
  type ReviewTargetProduct,
} from "./add-review-dialog";

// Enough results to scan without turning the picker into a second catalogue.
/** Products per batch in the picker; more append as it is scrolled. */
const RESULT_LIMIT = 10;

/**
 * Floating "add review" button for the reviews page.
 *
 * The reviews list is organised by review, not by product, so there's no row to
 * hang the action off — this picks the product first, then hands over to the
 * same `AddReviewDialog` the product table uses.
 */
export function AddReviewFab() {
  const api = useAxiosAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [selected, setSelected] = useState<ReviewTargetProduct | null>(null);

  // Clear the search as part of opening rather than in an effect watching
  // `pickerOpen` — same result, no cascading render.
  const openPicker = () => {
    setQuery("");
    setPickerOpen(true);
  };

  // An empty search still lists the first page, so the picker is useful before
  // the admin types anything. Further batches append as the list is scrolled.
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: productsError,
  } = useInfiniteQuery({
    queryKey: ["products", "review-picker", debouncedQuery],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productsService(api).getAll({
        search: debouncedQuery || undefined,
        page: pageParam,
        limit: RESULT_LIMIT,
        status: "all",
      }),
    getNextPageParam: (last: any) =>
      last?.hasMore ? (last.page ?? 1) + 1 : undefined,
    enabled: pickerOpen,
  });

  const products: { id: string; name: string; thumbnail?: string }[] = useMemo(
    () => (data?.pages ?? []).flatMap((page: any) => page?.data ?? []),
    [data],
  );

  // Appends the next batch when the end of the list comes into view; guarded
  // so rapid scrolling can't double-request a page or run past the last one.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!pickerOpen || !hasNextPage || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pickerOpen, hasNextPage, isFetchingNextPage, fetchNextPage, products.length]);

  const choose = (product: ReviewTargetProduct) => {
    setSelected(product);
    setPickerOpen(false);
  };

  return (
    <>
      <Button
        size="icon"
        aria-label="Add a review"
        title="Add a review"
        onClick={openPicker}
        className="fixed bottom-8 right-8 z-40 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Which product?</DialogTitle>
            <DialogDescription>
              Pick the product this review is for.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name…"
              className="pl-9"
            />
          </div>

          <div className="max-h-[320px] space-y-1 overflow-y-auto">
            {isFetching && !products.length ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))
            ) : !products.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {debouncedQuery
                  ? `No products match "${debouncedQuery}".`
                  : "No products found."}
              </p>
            ) : (
              products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    choose({
                      id: product.id,
                      name: product.name,
                      thumbnail: product.thumbnail,
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent"
                >
                  <ImageShimmer
                    src={product.thumbnail}
                    alt={product.name}
                    wrapperClassName="w-10 h-10 rounded-md border border-input flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {product.name}
                  </span>
                </button>
              ))
            )}

            {/* Crossing this pulls the next batch; the list above stays put. */}
            {hasNextPage && products.length > 0 && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading more…
                  </>
                ) : productsError ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void fetchNextPage()}
                  >
                    Failed to load more — Retry
                  </Button>
                ) : (
                  "Scroll for more"
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddReviewDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        product={selected}
      />
    </>
  );
}
