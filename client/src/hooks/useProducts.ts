import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { Product } from "@/types";

// Product reads from the NestJS backend. The full catalogue is small, so most
// listing pages fetch it once (cached by React Query) and facet on the client,
// mirroring the storefront's original static-data behaviour.
const E = API_ENDPOINTS.products;

/** The full product catalogue. */
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>(E.list),
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

/** Related products for a slug (disabled until a slug is available). */
export function useRelatedProducts(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug, "related"],
    queryFn: () => apiFetch<Product[]>(E.related(slug as string)),
    enabled: Boolean(slug),
  });
}
