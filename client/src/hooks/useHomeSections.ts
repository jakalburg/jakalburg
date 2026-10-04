import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { HeroSlide } from "@/hooks/useHeroSlides";

/**
 * The home page's section list, as configured in the admin's Website → Home
 * Setup tab. One row per block the storefront renders, already filtered to the
 * enabled ones and sorted into render order by the server.
 *
 * The `type` strings are the contract with `server/src/website/
 * home-sections.defaults.ts` — a type the server seeds but the client has no
 * renderer for is a section the admin can toggle to no effect.
 */
export type HomeSectionType =
  | "AnnouncementBar"
  | "HeroSlider"
  | "JustArrived"
  | "ShopByMood"
  | "EssentialsFeature"
  | "EverydayEdit"
  | "Footer";

export interface HomeSection {
  id: string;
  type: HomeSectionType | string;
  /** Small label above the heading. */
  eyebrow?: string | null;
  /** The section heading. */
  title?: string | null;
  subtitle?: string | null;
  order: number;
  paddingTop?: boolean | null;
  paddingBottom?: boolean | null;
  /** HeroSlider only: edge-to-edge photo carousel vs the split layout. */
  fullBleed?: boolean | null;
  data?: unknown;
}

/** `EssentialsFeature.data` — the editorial band's image, copy and button. */
export interface EssentialsFeatureData {
  image?: string;
  body?: string;
  buttonLabel?: string;
  buttonLink?: string;
}

/** `AnnouncementBar.data` — the thin bar above the header, on every page. */
export interface AnnouncementBarData {
  text?: string;
  /** Optional: makes the whole bar a link (e.g. to a sale). */
  linkHref?: string;
}

/** `Footer.data` — the site-wide footer background, as the admin configures it. */
export interface FooterBackgroundData {
  desktopImage?: string;
  mobileImage?: string;
  /** 0–100. How strongly the image shows through the footer's base colour. */
  desktopImageOpacity?: number;
  mobileImageOpacity?: number;
  separateMobileOpacity?: boolean;
}

/** Shared cache entry: the footer is on every page, the home blocks on one. */
const QUERY_KEY = ["home-sections"] as const;

/** Server-side read for `getStaticProps`, so the first paint is already correct. */
export async function fetchHomeSections(): Promise<HomeSection[]> {
  return apiFetch<HomeSection[]>(API_ENDPOINTS.website.homeSections);
}

/**
 * The enabled home sections.
 *
 * Pass `initialData` from a page's `getStaticProps` to avoid a layout shift as
 * the client fetch resolves. Falls back to an empty list when the backend is
 * unreachable — callers render their built-in defaults rather than nothing.
 */
export function useHomeSections(initialData?: HomeSection[]) {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchHomeSections,
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialData,
  });

  return { sections: data ?? [], isLoading };
}

/** The one section of a given type, or undefined when it's missing/disabled. */
export function findSection(
  sections: HomeSection[],
  type: HomeSectionType,
): HomeSection | undefined {
  return sections.find((section) => section.type === type);
}

/**
 * The footer background, resolved per breakpoint.
 *
 * Opacity is stored 0–100 as "how strongly the image appears", which the admin
 * preview renders as a white veil of `1 - opacity` over the image. Returning
 * the veil value here keeps the storefront and that preview in agreement.
 */
export function resolveFooterBackground(data: FooterBackgroundData | undefined) {
  if (!data) return null;

  const { desktopImage, mobileImage } = data;
  if (!desktopImage && !mobileImage) return null;

  const clamp = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : fallback;

  // Matches the admin modal's own default, so an image saved before the
  // opacity slider existed looks the same in both places.
  const desktopOpacity = clamp(data.desktopImageOpacity, 34);
  const mobileOpacity = data.separateMobileOpacity
    ? clamp(data.mobileImageOpacity, desktopOpacity)
    : desktopOpacity;

  return {
    // Mobile falls back to the desktop image when no separate one is set —
    // the same precedence the admin's mobile preview shows.
    desktopImage: desktopImage || mobileImage || "",
    mobileImage: mobileImage || desktopImage || "",
    desktopVeil: 1 - desktopOpacity / 100,
    mobileVeil: 1 - mobileOpacity / 100,
  };
}

/** Re-exported so the home page can type hero slides off one import. */
export type { HeroSlide };
