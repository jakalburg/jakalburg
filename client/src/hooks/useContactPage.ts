import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// The Contact page content edited in the admin's Website → Contact Page tab
// (server WebsiteContact singleton). All fields optional — the /contact page
// falls back to sensible copy when a field is blank. `mapLink`, when set, is
// what the store address links to.
export interface ContactPageContent {
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  mapLink?: string | null;
  title?: string | null;
  formDescription?: string | null;
  needTodayTitle?: string | null;
  needTodayDescription?: string | null;
}

/** The public Contact page content. Pass `initialData` from getStaticProps so
 *  the first paint already has the details (no flash of the fallback copy). */
export function useContactPage(initialData?: ContactPageContent) {
  return useQuery({
    queryKey: ["contact-page"],
    queryFn: () =>
      apiFetch<ContactPageContent>(API_ENDPOINTS.website.contact),
    staleTime: 5 * 60 * 1000,
    initialData,
  });
}
