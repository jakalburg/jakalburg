/**
 * Shared shape of the paginated envelope every list endpoint returns.
 * Mirrors `server/src/common/pagination`.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  skip?: number;
  take?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

/** Products per batch on the storefront grid. */
export const PRODUCT_PAGE_SIZE = 12;

/** Reviews per batch under a product. */
export const REVIEW_PAGE_SIZE = 10;

/** Orders per page in account → orders. */
export const ORDER_PAGE_SIZE = 10;

/**
 * Turn a query-param object into a search string, dropping empty values so a
 * cleared filter doesn't become `?size=` and split the React Query cache from
 * the identical unfiltered request.
 */
export function toQueryString(
  params: Record<string, string | number | boolean | string[] | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (!value.length) continue;
      search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Accept either the envelope or a bare array.
 *
 * The storefront can be deployed against an API build that predates
 * pagination; treating an array as one full page keeps those pages rendering
 * instead of going blank.
 */
export function toPaginated<T>(raw: unknown, fallbackLimit: number): Paginated<T> {
  if (Array.isArray(raw)) {
    return {
      data: raw as T[],
      total: raw.length,
      page: 1,
      limit: raw.length || fallbackLimit,
      totalPages: 1,
      hasMore: false,
    };
  }

  const envelope = (raw ?? {}) as Partial<Paginated<T>>;
  const data = Array.isArray(envelope.data) ? envelope.data : [];
  return {
    data,
    total: envelope.total ?? data.length,
    page: envelope.page ?? 1,
    limit: envelope.limit ?? fallbackLimit,
    totalPages: envelope.totalPages ?? 1,
    hasMore: envelope.hasMore ?? false,
  };
}
