/**
 * Shared pagination helpers.
 *
 * Every list endpoint funnels its page/limit (or skip/take) params through
 * `parsePagination` so a caller can never ask for an unbounded result set, and
 * wraps its rows with `paginate` so every list speaks the same envelope.
 *
 * The envelope keeps the `{ data, total, skip, take, hasMore }` shape the
 * products/orders admin lists already returned — the page-oriented fields are
 * additive, so existing consumers keep working.
 */

/** Rows per page when the caller doesn't say. */
export const DEFAULT_PAGE_SIZE = 10;

/** Hard ceiling — `?limit=999999` can never reach the database. */
export const MAX_PAGE_SIZE = 100;

/** What a list endpoint accepts. `skip`/`take` win over `page`/`limit` when
 *  both are given, so the older skip/take callers keep their exact behaviour. */
export interface PaginationQuery {
  page?: number | string;
  limit?: number | string;
  skip?: number | string;
  take?: number | string;
}

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  skip: number;
  take: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Coerce anything to a positive integer, or undefined when it isn't one.
 *  Guards against `?page=abc`, `?limit=-5`, `?limit=1e9` and friends. */
function toPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const floored = Math.floor(n);
  return floored >= 0 ? floored : undefined;
}

/**
 * Normalise pagination input into safe `skip`/`take` plus the `page`/`limit`
 * the same values represent. Invalid input falls back to page 1 × the default
 * size rather than throwing — a junk query string shouldn't 400 a list screen.
 */
export function parsePagination(
  query: PaginationQuery = {},
  defaultLimit = DEFAULT_PAGE_SIZE,
): PaginationParams {
  const rawTake = toPositiveInt(query.take) ?? toPositiveInt(query.limit);
  // `take` of 0 is meaningless for a list — treat it as "unspecified".
  const take = Math.min(MAX_PAGE_SIZE, Math.max(1, rawTake || defaultLimit));

  // Explicit skip wins; otherwise derive it from the 1-based page.
  const explicitSkip = toPositiveInt(query.skip);
  const page = Math.max(1, toPositiveInt(query.page) || 1);
  const skip = explicitSkip !== undefined ? explicitSkip : (page - 1) * take;

  return {
    skip,
    take,
    // Keep `page` consistent with `skip` when the caller used skip/take.
    page: explicitSkip !== undefined ? Math.floor(explicitSkip / take) + 1 : page,
    limit: take,
  };
}

/** Wrap rows + a total in the standard envelope. */
export function paginate<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const { skip, take, page, limit } = params;
  const hasMore = skip + data.length < total;
  return {
    data,
    total,
    skip,
    take,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / take)),
    hasMore,
    hasNextPage: hasMore,
    hasPreviousPage: skip > 0,
  };
}
