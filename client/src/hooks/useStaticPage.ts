import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/** One question/answer row inside a FAQ section. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** A heading and the Q&A grouped under it on the FAQ page. */
export interface FaqSection {
  heading: string;
  items: FaqItem[];
}

/**
 * A static page edited in the admin's Website → Static Pages screen (server
 * `Page` model). `content` is rich-text HTML for the policy pages;
 * `faqSections` is the structured Q&A used by the FAQ page instead.
 */
export interface StaticPage {
  title: string;
  slug: string;
  content?: string | null;
  faqSections?: FaqSection[] | null;
}

/** Server-side fetch for getStaticProps. Returns null when the page is
 *  missing or an admin has set it inactive, so callers fall back to their
 *  built-in copy rather than rendering an empty shell. */
export async function fetchStaticPage(
  slug: string,
): Promise<StaticPage | null> {
  try {
    return await apiFetch<StaticPage>(API_ENDPOINTS.pages.bySlug(slug));
  } catch {
    return null;
  }
}

/** The page content. Pass `initialData` from getStaticProps so the first paint
 *  already has the admin's copy (no flash of the fallback). */
export function useStaticPage(slug: string, initialData?: StaticPage) {
  return useQuery({
    queryKey: ["static-page", slug],
    queryFn: () => apiFetch<StaticPage>(API_ENDPOINTS.pages.bySlug(slug)),
    staleTime: 5 * 60 * 1000,
    initialData,
    retry: false,
  });
}
