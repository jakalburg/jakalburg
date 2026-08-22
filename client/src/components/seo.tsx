import Head from "next/head";
import { useRouter } from "next/router";

const SITE_NAME = "Jakalburg";
const SITE_URL = "https://jakalburg.com";
const DEFAULT_TITLE = "Jakalburg — Considered wardrobe essentials";
const DEFAULT_DESCRIPTION =
  "Jakalburg is a considered ready-to-wear label — linen, cotton, wool and denim pieces built to last, in a restrained palette.";

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

const getCanonicalUrl = (path: string) => {
  const cleanPath = (path || "/").split("?")[0].split("#")[0] || "/";
  if (cleanPath === "/") return SITE_URL;
  return `${SITE_URL}${trimTrailingSlash(cleanPath)}`;
};

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

  const metaTitle =
    title ||
    (pageTitle
      ? pageTitle.includes(SITE_NAME)
        ? pageTitle
        : `${pageTitle} | ${SITE_NAME}`
      : DEFAULT_TITLE);
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = getCanonicalUrl(canonicalPath || router.asPath || "/");

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />

      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {image && <meta name="twitter:image" content={image} />}
    </Head>
  );
}
