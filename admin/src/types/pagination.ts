/**
 * The envelope every paginated admin endpoint returns.
 *
 * Mirrors the server's shared pagination helper
 * (`server/src/common/pagination`). `skip`/`take`/`hasNextPage` are also sent
 * but optional here — most screens only need the page-oriented fields.
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

/** Query params every paginated admin list accepts. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** Rows per page across admin tables, and batch size for scroll-loaded dropdowns. */
export const DEFAULT_PAGE_SIZE = 10;

/** The server's hard ceiling on `limit` (`server/src/common/pagination`).
 *  What a dropdown asks for when it genuinely needs every row at once. */
export const MAX_PAGE_SIZE = 100;

/**
 * Normalise whatever a list endpoint returned into a `Paginated<T>`.
 *
 * Endpoints that have not been migrated yet (and the mock API router) still
 * return a bare array; treating that as a single full page keeps those screens
 * working instead of rendering empty.
 */
export function toPaginated<T>(
  raw: unknown,
  fallbackLimit = DEFAULT_PAGE_SIZE,
): Paginated<T> {
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
    skip: envelope.skip,
    take: envelope.take,
    hasNextPage: envelope.hasNextPage,
    hasPreviousPage: envelope.hasPreviousPage,
  };
}
