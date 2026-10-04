import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { womenCategories, menCategories } from "@/data/categories";

export type NavGender = "women" | "men";

/** A category as the nav renders it: where it links, and what it's called. */
export interface NavCategory {
  /** The /category/[slug] route segment, e.g. "women-dresses". */
  slug: string;
  /** Display label, e.g. "T-shirts". */
  title: string;
}

/**
 * Categories for the storefront nav, from the live catalogue.
 *
 * The server returns bare category slugs ("dresses", "t-shirts") scoped to one
 * gender and to products that are actually active, so a category with nothing
 * live in it never reaches the menu. The /category/[slug] route is keyed on the
 * gender-prefixed form ("women-dresses"), which is what we rebuild here.
 */
export async function fetchNavCategories(
  gender: NavGender,
): Promise<NavCategory[]> {
  const raw = await apiFetch<string[]>(
    `${API_ENDPOINTS.products.categories}?gender=${encodeURIComponent(gender)}`,
  );
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => typeof c === "string" && c.trim())
    .map((category) => ({
      slug: `${gender}-${category}`,
      title: titleCase(category),
    }));
}

/**
 * Turn a category slug into a label: "t-shirts" → "T-shirts".
 *
 * Only the first word is capitalised, deliberately — these read as sentence-case
 * nouns in the menu ("Shirts", "Puffer jackets"), not Title Case Headlines.
 */
export function titleCase(slug: string): string {
  const words = slug.replace(/-/g, " ").trim();
  if (!words) return slug;
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The shipped category lists, used only when the API gives us nothing.
 *
 * Same reasoning as STATIC_FALLBACK_COLLECTIONS: a menu that renders empty
 * because the backend blinked is worse than one showing the stock set. These
 * slugs are already the gender-prefixed route form.
 */
const FALLBACK: Record<NavGender, NavCategory[]> = {
  women: womenCategories.map((c) => ({ slug: c.slug, title: c.title })),
  men: menCategories.map((c) => ({ slug: c.slug, title: c.title })),
};

/**
 * Split a /category/[slug] segment into the gender and category it filters on.
 *
 * Returns null for anything that isn't gender-prefixed, so a junk slug 404s
 * instead of rendering an empty listing. Callers should still check the
 * category against the live catalogue — this only parses the shape.
 */
export function parseCategorySlug(
  slug: string,
): { gender: NavGender; category: string } | null {
  for (const gender of ["women", "men"] as const) {
    const prefix = `${gender}-`;
    if (slug.startsWith(prefix) && slug.length > prefix.length) {
      return { gender, category: slug.slice(prefix.length) };
    }
  }
  return null;
}

export function useNavCategories(gender: NavGender) {
  const query = useQuery({
    queryKey: ["nav-categories", gender],
    queryFn: () => fetchNavCategories(gender),
    // The catalogue's category set changes rarely; don't re-ask on every
    // drawer open.
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const categories =
    query.data && query.data.length > 0 ? query.data : FALLBACK[gender];

  return { ...query, categories };
}
