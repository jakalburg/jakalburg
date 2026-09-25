import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  PRODUCT_PAGE_SIZE,
  toPaginated,
  toQueryString,
  type Paginated,
} from "@/lib/pagination";
import type { Product } from "@/types";

// Product reads from the NestJS backend. Listing pages pull one page at a time
// and append as the shopper scrolls, so the catalogue is never downloaded
// whole — filters, search and sort are all applied in the database.
const E = API_ENDPOINTS.products;

/** Filters a listing page can apply. All are handled server-side. */
export interface ProductListFilters {
  gender?: string;
  category?: string;
  collection?: string;
  isNew?: boolean;
  onSale?: boolean;
  essential?: boolean;
  search?: string;
  size?: string;
  color?: string;
  sort?: string;
  /** Restrict to specific ids — the wishlist knows ids, not pages. */
  ids?: string[];
  limit?: number;
}

/** Distinct filter values across everything matching the current filters. */
export interface ProductFacets {
  sizes: string[];
  colors: string[];
}

/** Stable query key: the filters, with undefined entries dropped. */
function filterKey(filters: ProductListFilters) {
  return Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
}

/**
 * One page of products at a time, appending as `fetchNextPage` is called.
 *
 * Returns `products` already flattened across loaded pages, so callers render
 * it exactly like the old full-catalogue array.
 */
export function useProductsInfinite(
  filters: ProductListFilters = {},
  options: { enabled?: boolean } = {},
) {
  const limit = filters.limit ?? PRODUCT_PAGE_SIZE;

  const query = useInfiniteQuery({
    // Changing any filter starts a fresh page 1 rather than appending to the
    // previous filter's results.
    queryKey: ["products", "list", filterKey(filters)],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiFetch<Paginated<Product> | Product[]>(
        `${E.list}${toQueryString({ ...filters, page: pageParam, limit })}`,
      ).then((raw) => toPaginated<Product>(raw, limit)),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: options.enabled ?? true,
  });

  const products = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  return {
    ...query,
    products,
    /** Total matching products, not just the loaded ones. */
    total: query.data?.pages[0]?.total ?? 0,
  };
}

/**
 * A single page of products — for curated rows (home page, "you may also
 * like") that show a fixed number and never paginate.
 */
export function useProductsPage(
  filters: ProductListFilters = {},
  options: { enabled?: boolean } = {},
) {
  const limit = filters.limit ?? PRODUCT_PAGE_SIZE;
  return useQuery({
    queryKey: ["products", "page", filterKey(filters)],
    queryFn: () =>
      apiFetch<Paginated<Product> | Product[]>(
        `${E.list}${toQueryString({ ...filters, page: 1, limit })}`,
      ).then((raw) => toPaginated<Product>(raw, limit)),
    enabled: options.enabled ?? true,
  });
}

/**
 * Distinct sizes/colours for the current filters, so the filter chips stay
 * complete even though only one page of products is in memory.
 */
export function useProductFacets(
  filters: Omit<ProductListFilters, "size" | "color" | "limit"> = {},
) {
  return useQuery({
    queryKey: ["products", "facets", filterKey(filters)],
    queryFn: () =>
      apiFetch<ProductFacets>(`${E.facets}${toQueryString({ ...filters })}`),
    // Facets shift far less often than the listing itself.
    staleTime: 5 * 60 * 1000,
  });
}

/** A single product by slug (disabled until a slug is available). */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => apiFetch<Product>(E.detail(slug as string)),
    enabled: Boolean(slug),
  });
}

/** Related products for a slug (disabled until a slug is available). The
 *  server already caps this at a handful, so it stays a plain array. */
export function useRelatedProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug, "related"],
    queryFn: () => apiFetch<Product[]>(E.related(slug as string)),
    enabled: Boolean(slug),
  });
}
