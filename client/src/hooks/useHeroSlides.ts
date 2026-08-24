import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

// A hero slide as configured in the admin's Website → Home Setup tab. It is
// image-first: the storefront renders `video` when present, otherwise `image`
// (with optional mobile variants), and the whole slide links to `link`. Any
// headline/CTA is baked into the marketing image itself — no copy fields.
export interface HeroSlide {
  id: string;
  image: string;
  video?: string;
  mobileImage?: string;
  mobileVideo?: string;
  link?: string;
  categoryId?: string;
}

// The hero config the storefront renders. `fullBleed` picks the presentation:
// true → an edge-to-edge photo carousel; false → the split text+image layout
// (fixed headline/buttons on the left, these slide images beside them).
export interface HeroConfig {
  fullBleed: boolean;
  slides: HeroSlide[];
}

/** The enabled hero slider config (fullBleed + slides). `slides` is empty when
 *  none/disabled — callers fall back to the static hero.
 *
 *  Pass `initialData` (from the page's getStaticProps) so the very first paint
 *  already knows `fullBleed` — otherwise the hero would flash the split layout
 *  (the default) before the client fetch resolves to full-bleed. */
export function useHeroSlides(initialData?: HeroConfig) {
  return useQuery({
    queryKey: ["hero-slides"],
    queryFn: () => apiFetch<HeroConfig>(API_ENDPOINTS.website.hero),
    staleTime: 5 * 60 * 1000,
    initialData,
  });
}
