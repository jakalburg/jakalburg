import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/**
 * The About page content edited in the admin's Website → About Page tab
 * (server WebsiteAbout singleton). All fields optional — /about falls back to
 * its built-in copy when a field is blank.
 *
 * `description` is plain text: blank lines separate paragraphs.
 */
export interface AboutPageContent {
  subtitle?: string | null;
  title?: string | null;
  description?: string | null;
  imageMain?: string | null;
}

/** Server-side fetch for getStaticProps; null when unreachable. */
export async function fetchAboutPage(): Promise<AboutPageContent | null> {
  try {
    return await apiFetch<AboutPageContent>(API_ENDPOINTS.website.about);
  } catch {
    return null;
  }
}

/** The public About page content. Pass `initialData` from getStaticProps so
 *  the first paint already has the real copy. */
export function useAboutPage(initialData?: AboutPageContent) {
  return useQuery({
    queryKey: ["about-page"],
    queryFn: () => apiFetch<AboutPageContent>(API_ENDPOINTS.website.about),
    staleTime: 5 * 60 * 1000,
    initialData,
    retry: false,
  });
}
