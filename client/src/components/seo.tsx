import Head from "next/head";
import { useRouter } from "next/router";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export interface SeoProps {
  pageTitle?: string;
  title?: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
  type?: string;
  noIndex?: boolean;
}

const trimTrailingSlash = (url: string) =>
  url.length > 1 ? url.replace(/\/+$/, "") : url;

/**
 * Per-page meta tags, with the site-wide defaults (name, title, description,
 * canonical origin, favicon, og:image) coming from the admin's Settings →
 * Store screen.
 *
 * NOTE: settings are fetched client-side, so the server-rendered HTML carries
 * `SITE_FALLBACK` and the admin's values are swapped in on hydration. Crawlers
 * that execute JS see the live values; ones that don't see the fallbacks, which
 * are the same copy that used to be hardcoded here. Anything a page passes
 * explicitly (`title`, `description`, …) is rendered server-side as before and
 * is unaffected.
 */
export default function SEO({
  pageTitle,
  title,
  description,
  image,
  canonicalPath,
  type = "website",
  noIndex = false,
}: SeoProps) {
  const router = useRouter();
  const {
    storeName,
    favicon,
    miniLogo,
    seoTitle,
    seoDescription,
    siteUrl,
  } = useSiteSettings();

  const getCanonicalUrl = (path: string) => {
    const origin = trimTrailingSlash(siteUrl);
    const cleanPath = (path || "/").split("?")[0].split("#")[0] || "/";
    if (cleanPath === "/") return origin;
    return `${origin}${trimTrailingSlash(cleanPath)}`;
  };

  const metaTitle =
    title ||
    (pageTitle
      ? pageTitle.includes(storeName)
        ? pageTitle
        : `${pageTitle} | ${storeName}`
      : seoTitle);
  const metaDescription = description || seoDescription;
  const canonicalUrl = getCanonicalUrl(canonicalPath || router.asPath || "/");
  // Pages can pass their own share image (a product shot); otherwise fall back
  // to the compact brand mark so links never unfurl bare.
  const metaImage = image || miniLogo;

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="icon" href={favicon} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={storeName} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      {metaImage && <meta property="og:image" content={metaImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {metaImage && <meta name="twitter:image" content={metaImage} />}
    </Head>
  );
}
