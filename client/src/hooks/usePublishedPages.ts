import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/** A published page, as the nav needs it. */
export interface NavPage {
  slug: string;
  title: string;
}

/**
 * Page slugs this storefront actually has a route for.
 *
 * The admin can create a page with any slug, but Next.js only renders the
 * ones with a matching file in src/pages — there is no catch-all. Linking
 * anything outside this set would put a guaranteed 404 in the menu, so a
 * newly created page stays out of the nav until it has a route.
 *
 * Keep in step with src/pages/*.tsx if a new static page is ever added.
 */
const ROUTABLE_SLUGS = new Set([
  "about",
  "faq",
  "shipping-policy",
  "returns-policy",
  "privacy-policy",
  "terms",
]);

/**
 * The order these read best in a menu — broadly "what is this shop" first,
 * then the things you need while buying, then the legal pages. The API orders
 * by creation date, which carries no meaning for a reader.
 */
const MENU_ORDER = [
  "about",
  "faq",
  "shipping-policy",
  "returns-policy",
  "terms",
  "privacy-policy",
];

/** Shorter labels than the page titles, which are written for page headings. */
const NAV_LABELS: Record<string, string> = {
  "about": "Our story",
  "faq": "FAQ",
  "shipping-policy": "Shipping",
  "returns-policy": "Returns",
  "privacy-policy": "Privacy",
  "terms": "Terms",
};

interface ApiPage {
  slug: string;
  title: string;
  status?: string;
}

/**
 * Published pages that the storefront can actually open.
 *
 * The endpoint already filters to `status: 'active'`, so unpublishing a page
 * in the admin removes it from the menu rather than leaving a link that 404s.
 */
export function usePublishedPages() {
  const query = useQuery({
    queryKey: ["published-pages"],
    queryFn: async () => {
      const raw = await apiFetch<ApiPage[]>(API_ENDPOINTS.pages.list);
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((p) => p?.slug && ROUTABLE_SLUGS.has(p.slug))
        .map<NavPage>((p) => ({
          slug: p.slug,
          title: NAV_LABELS[p.slug] ?? p.title,
        }))
        .sort(
          (a, b) => MENU_ORDER.indexOf(a.slug) - MENU_ORDER.indexOf(b.slug),
        );
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  // No fallback list on purpose: if we can't confirm a page is published, we
  // don't advertise it. An unreachable API hides the Help section for a
  // moment, which is better than linking a page an admin has taken down.
  return { ...query, pages: query.data ?? [] };
}
