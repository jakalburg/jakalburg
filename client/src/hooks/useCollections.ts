import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { toPaginated, toQueryString, type Paginated } from "@/lib/pagination";
import { collections as staticCollections } from "@/data/collections";

/** The storefront nav renders every collection; this is the server's cap. */
const COLLECTIONS_LIMIT = 100;

// Editorial collections ("Shop by mood") come from the NestJS backend and are
// managed in the admin (photo, title, subtitle, description, order, enabled).
// Membership lives on the product (Product.collections = collection slugs), so
// each row carries a server-derived `productCount`.

/** A collection as returned by the server (matches CollectionResponseDto). */
export interface ApiCollection {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  description: string | null;
  enabled: boolean;
  order: number;
  productCount: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch the enabled collections, ordered. Usable from getStaticProps to seed
 * React Query's initialData (so the first paint already has them, no flash).
 */
export async function fetchEnabledCollections(): Promise<ApiCollection[]> {
  // The endpoint is paginated, but its default page is sized for exactly this
  // read — the nav lists every collection at once. `toPaginated` also accepts
  // a bare array, so an older API build still works.
  const raw = await apiFetch<Paginated<ApiCollection> | ApiCollection[]>(
    `${API_ENDPOINTS.collections.list}${toQueryString({ limit: COLLECTIONS_LIMIT })}`,
  );
  return toPaginated<ApiCollection>(raw, COLLECTIONS_LIMIT)
    .data.filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order);
}

/** The enabled collections (cached). Optionally seeded from getStaticProps. */
export function useCollections(initialData?: ApiCollection[]) {
  return useQuery({
    queryKey: ["collections"],
    queryFn: fetchEnabledCollections,
    initialData,
  });
}

/** The fields the storefront tiles/hero render, normalised across sources. */
export interface CollectionDisplay {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image?: string;
}

/** Map a server collection into the storefront's display shape. */
export function toDisplayCollection(c: ApiCollection): CollectionDisplay {
  return {
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? "",
    description: c.description ?? "",
    image: c.image ?? undefined,
  };
}

/**
 * The shipped collections, in the display shape — used as a graceful fallback
 * when the backend is unreachable so the homepage/collections pages never render
 * an empty section.
 */
export const STATIC_FALLBACK_COLLECTIONS: CollectionDisplay[] =
  staticCollections.map((c) => ({
    slug: c.slug,
    title: c.title,
    subtitle: c.tagline,
    description: c.description,
    image: c.image,
  }));

/**
 * Prefer live collections; fall back to the shipped static set only when the
 * live list is empty (e.g. backend down at build + runtime).
 */
export function resolveCollections(
  api: ApiCollection[] | undefined,
): CollectionDisplay[] {
  if (api && api.length > 0) return api.map(toDisplayCollection);
  return STATIC_FALLBACK_COLLECTIONS;
}
