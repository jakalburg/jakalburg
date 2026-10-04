/**
 * Cache key namespaces and TTLs.
 *
 * Every key begins with a namespace so a write can invalidate a whole family
 * with one `delPattern(NS.x + '*')` rather than tracking individual keys.
 *
 * TTLs are deliberately generous. The cache is a read-through in front of
 * Postgres and every write path invalidates explicitly, so a long TTL costs
 * nothing in staleness but saves commands — which matters on Upstash's free
 * plan of 10,000 commands per day. The TTL is the backstop for the case where
 * an invalidation is missed, not the primary freshness mechanism.
 */
export const CACHE_NS = {
  settings: 'settings:',
  products: 'products:',
  collections: 'collections:',
  categories: 'categories:',
  fabrics: 'fabrics:',
  pages: 'pages:',
  website: 'website:',
  reviews: 'reviews:',
} as const;

export const CACHE_TTL = {
  /** Singletons read on essentially every storefront render. */
  settings: 60 * 60,
  website: 60 * 60,
  pages: 60 * 30,
  /** Catalogue data: changes more often and is likelier to be noticed stale. */
  collections: 60 * 15,
  categories: 60 * 15,
  fabrics: 60 * 15,
  productList: 60 * 5,
  productDetail: 60 * 10,
  reviews: 60 * 10,
} as const;

/**
 * Stable key fragment for a filter/query object. JSON.stringify alone is not
 * stable — `{a,b}` and `{b,a}` would produce different keys for the same
 * query, silently halving the hit rate — so sort the entries first and drop
 * undefined values.
 */
export function cacheKeyFor(
  namespace: string,
  parts: Record<string, unknown>,
): string {
  const normalised = Object.entries(parts)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('|');

  return `${namespace}${normalised || 'all'}`;
}
