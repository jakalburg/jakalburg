import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal } from "lucide-react";
import {
  useProductFacets,
  useProductsInfinite,
  type ProductListFilters,
} from "@/hooks/useProducts";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface CollectionSearch {
  size?: string;
  color?: string;
  sort?: SortKey;
}

interface Props {
  title: string;
  eyebrow?: string;
  description?: string;
  /**
   * Which slice of the catalogue this page shows (gender, category,
   * collection, isNew, …). Size/colour/sort come from the URL and are merged
   * in here, then all of it is sent to the API — nothing is filtered locally.
   */
  filters: ProductListFilters;
}

const sortLabels: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function CollectionView({ title, eyebrow, description, filters }: Props) {
  const router = useRouter();
  const search: CollectionSearch = {
    size: typeof router.query.size === "string" ? router.query.size : undefined,
    color: typeof router.query.color === "string" ? router.query.color : undefined,
    sort: typeof router.query.sort === "string" ? (router.query.sort as SortKey) : undefined,
  };

  // Filter chips list every size/colour in the matching set, which a single
  // page of products can't tell us — hence the dedicated facets endpoint.
  const { data: facets } = useProductFacets(filters);
  const allSizes = facets?.sizes ?? [];
  const allColors = facets?.colors ?? [];

  const {
    products,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useProductsInfinite({
    ...filters,
    size: search.size,
    color: search.color,
    sort: search.sort,
  });

  // Changing a filter or sort restarts at page 1 — React Query does that for us
  // by keying on the filters.
  //
  // The scroll needs a nudge too, but NOT back to the top of the document: the
  // filter sidebar sits beside the grid, so a shopper who filters from halfway
  // down was thrown past the heading they had already scrolled by. Re-anchor to
  // the results instead, and only when they've gone out of view above —
  // filtering from the top of the page should not move anything at all.
  const resultsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = resultsRef.current;
    if (!node) return;
    if (node.getBoundingClientRect().top < 0) {
      // `scroll-mt-20` on the node keeps it clear of the sticky header.
      node.scrollIntoView({ block: "start" });
    }
  }, [search.size, search.color, search.sort]);

  const update = (patch: Partial<CollectionSearch>) => {
    const next: Record<string, string | string[] | undefined> = { ...router.query, ...patch };
    (["size", "color", "sort"] as const).forEach((k) => {
      if (!next[k]) delete next[k];
    });
    // `scroll: false` matters as much as the effect above: Next scrolls to the
    // top of the document on every push, shallow or not. Without it the effect
    // can only ever re-anchor a page the router has already jumped.
    void router.push({ pathname: router.pathname, query: next }, undefined, {
      shallow: true,
      scroll: false,
    });
  };

  const filterControls = (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3 text-mute-text">Size</p>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ size: search.size === s ? undefined : s })}
              aria-pressed={search.size === s}
              className={`min-w-10 border px-3 py-1.5 text-sm ${
                search.size === s ? "border-foreground bg-foreground text-primary-foreground" : "border-line"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3 text-mute-text">Colour</p>
        <div className="space-y-2">
          {allColors.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={search.color === c}
                onCheckedChange={(v) => update({ color: v ? c : undefined })}
                aria-label={c}
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      {(search.size || search.color) && (
        <Button variant="outline" size="sm" onClick={() => update({ size: undefined, color: undefined })}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <section className="container-vh py-10">
      <header className="mb-8">
        {eyebrow && <p className="eyebrow text-mute-text">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </header>

      <div ref={resultsRef} className="mb-6 flex scroll-mt-20 items-center justify-between">
        <p className="text-xs text-mute-text">
          {isLoading ? "Loading…" : `${total} ${total === 1 ? "piece" : "pieces"}`}
        </p>
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{filterControls}</div>
              </SheetContent>
            </Sheet>
          </div>
          <Select
            value={search.sort ?? "featured"}
            onValueChange={(v) => update({ sort: v as SortKey })}
          >
            <SelectTrigger className="w-[180px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{sortLabels[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filterControls}</aside>
        <ProductGrid
          products={products}
          isLoading={isLoading}
          paginate
          hasMore={Boolean(hasNextPage)}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={() => void fetchNextPage()}
          total={total}
          error={error}
        />
      </div>
    </section>
  );
}
