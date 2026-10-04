import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/**
 * Global store identity, edited in the admin's Settings → Store screen (server
 * `Settings` model). Every field is optional — callers fall back to
 * `SITE_FALLBACK` rather than render blank space.
 */
export interface SiteSettings {
  storeName?: string | null;
  tagline?: string | null;
  logo?: string | null;
  miniLogo?: string | null;
  favicon?: string | null;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  mapLink?: string | null;

  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  youtubeUrl?: string | null;

  seoTitle?: string | null;
  seoDescription?: string | null;
  siteUrl?: string | null;
}

/**
 * What the storefront renders before the API answers, and whenever a field is
 * blank. These are the values that were hardcoded across Header, Footer and
 * seo.tsx before this screen existed, so the first paint is unchanged and a
 * cold/unreachable API degrades to the old behaviour instead of empty space.
 *
 * The logo paths point at the files bundled in client/public; once an admin
 * uploads a mark it comes back as a Cloudinary URL and wins.
 */
export const SITE_FALLBACK = {
  storeName: "Jakalburg",
  tagline: "Considered wardrobe essentials in natural fibres, made to be kept.",
  logo: "/logo.png",
  miniLogo: "/mini_logo.png",
  favicon: "/favicon.png",
  seoTitle: "Jakalburg — Considered wardrobe essentials",
  seoDescription:
    "Jakalburg is a considered ready-to-wear label — linen, cotton, wool and denim pieces built to last, in a restrained palette.",
  siteUrl: "https://jakalburg.com",
} as const;

/** Trim a value and drop it if it's blank, so "" falls through to a fallback. */
const clean = (value?: string | null) => value?.trim() || undefined;

/**
 * The resolved store identity: whatever the admin has set, with
 * `SITE_FALLBACK` filling every gap. Shared across the app by React Query's
 * cache, so the header, footer and SEO tags all hit the network once.
 */
export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => apiFetch<SiteSettings>(API_ENDPOINTS.settings.get),
    // Short window: an admin saving in Settings → Store expects to see the
    // change on the site right away, so trade a small refetch for freshness.
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  return {
    storeName: clean(data?.storeName) ?? SITE_FALLBACK.storeName,
    tagline: clean(data?.tagline) ?? SITE_FALLBACK.tagline,
    logo: clean(data?.logo) ?? SITE_FALLBACK.logo,
    miniLogo: clean(data?.miniLogo) ?? SITE_FALLBACK.miniLogo,
    favicon: clean(data?.favicon) ?? SITE_FALLBACK.favicon,

    email: clean(data?.email),
    phone: clean(data?.phone),
    address: clean(data?.address),
    mapLink: clean(data?.mapLink),

    seoTitle: clean(data?.seoTitle) ?? SITE_FALLBACK.seoTitle,
    seoDescription:
      clean(data?.seoDescription) ?? SITE_FALLBACK.seoDescription,
    siteUrl: clean(data?.siteUrl) ?? SITE_FALLBACK.siteUrl,

    // Only the accounts that are actually set, in the order they're rendered.
    socials: (
      [
        { key: "instagram", url: clean(data?.instagramUrl) },
        { key: "facebook", url: clean(data?.facebookUrl) },
        { key: "twitter", url: clean(data?.twitterUrl) },
        { key: "youtube", url: clean(data?.youtubeUrl) },
        { key: "linkedin", url: clean(data?.linkedinUrl) },
      ] as const
    ).filter((s): s is { key: typeof s.key; url: string } => Boolean(s.url)),
  };
}
