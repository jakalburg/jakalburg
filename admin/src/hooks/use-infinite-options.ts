"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDebounce } from "./use-debounce";
import { DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

/** Batch size for scroll-loaded dropdowns. */
export const OPTIONS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

interface UseInfiniteOptionsArgs<T> {
  /** Stable key prefix, e.g. ["customers", "picker"]. */
  queryKey: readonly unknown[];
  /** Fetch one page. `search` is already debounced. */
  fetchPage: (args: {
    page: number;
    limit: number;
    search?: string;
  }) => Promise<Paginated<T>>;
  /** Only fetch once the dropdown is actually open. */
  enabled?: boolean;
  pageSize?: number;
  /** Debounce for the search box, so typing isn't one request per keystroke. */
  debounceMs?: number;
}

/**
 * Backing state for a searchable dropdown that loads 10 options at a time and
 * appends more as the user scrolls.
 *
 * Wraps React Query's `useInfiniteQuery`, which already gives us the things a
 * hand-rolled version gets wrong: one in-flight request per page, no refetch of
 * a page already held, and results keyed by search term so a slow response for
 * an old term can't overwrite a newer one.
 */
export function useInfiniteOptions<T>({
  queryKey,
  fetchPage,
  enabled = true,
  pageSize = OPTIONS_PAGE_SIZE,
  debounceMs = 300,
}: UseInfiniteOptionsArgs<T>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, debounceMs);
  const term = debouncedSearch.trim();

  const query = useInfiniteQuery({
    // The term is part of the key, so changing it starts a fresh page 1 and
    // discards the previous options rather than appending to them.
    queryKey: [...queryKey, term],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchPage({ page: pageParam, limit: pageSize, search: term || undefined }),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled,
  });

  const options = useMemo(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  );

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  /**
   * Attach to the scrollable list; loads the next batch as its end comes into
   * view. `hasNextPage` and `isFetchingNextPage` gate it, so rapid scrolling
   * can't queue the same page twice or request anything past the last one.
   */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!enabled || !hasNextPage || isFetchingNextPage) return;
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
  }, [enabled, hasNextPage, isFetchingNextPage, fetchNextPage, options.length]);

  return {
    options,
    search,
    setSearch,
    /** True only for the initial load of a term, not for appends. */
    isLoading: query.isFetching && !query.isFetchingNextPage,
    isLoadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    error: query.error as Error | null,
    total: query.data?.pages[0]?.total ?? 0,
    /** Retry after a failed page fetch, keeping what's already loaded. */
    fetchMore: () => void fetchNextPage(),
    sentinelRef,
  };
}
