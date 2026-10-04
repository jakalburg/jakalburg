import type { GetStaticPaths, GetStaticProps } from "next";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CollectionView } from "@/components/collection/CollectionView";
import { findCategory } from "@/data/categories";
import {
  fetchNavCategories,
  parseCategorySlug,
  titleCase,
  type NavGender,
} from "@/hooks/useNavCategories";

interface CategoryPageProps {
  slug: string;
  /** The raw category value the product filter uses, e.g. "co-ord-sets". */
  category: string;
  gender: NavGender;
  title: string;
}

/**
 * Pre-build the categories that exist right now, in both genders.
 *
 * `fallback: "blocking"` rather than `false`, because this list is derived
 * from the catalogue: stock a category that didn't exist at build time and its
 * page is rendered on first request instead of 404ing until the next deploy.
 * That also means the nav — which reads the same live list — can never link to
 * a page this route refuses to serve.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const [women, men] = await Promise.all([
      fetchNavCategories("women"),
      fetchNavCategories("men"),
    ]);
    return {
      paths: [...women, ...men].map((c) => ({ params: { slug: c.slug } })),
      fallback: "blocking",
    };
  } catch {
    // Backend unreachable at build time: ship no pre-built pages and let them
    // render on demand rather than failing the build.
    return { paths: [], fallback: "blocking" };
  }
};

export const getStaticProps: GetStaticProps<CategoryPageProps> = async ({
  params,
}) => {
  const slug = String(params?.slug ?? "");

  // Legacy slugs first. The shipped list isn't a plain "<gender>-<category>"
  // join everywhere — "women-tshirts" filters on the category "t-shirts" — so
  // old links and anything already indexed keep resolving exactly as before.
  const legacy = findCategory(slug);
  const parsed = legacy
    ? { gender: legacy.gender as NavGender, category: legacy.category }
    : parseCategorySlug(slug);

  if (!parsed || (parsed.gender !== "women" && parsed.gender !== "men")) {
    return { notFound: true };
  }

  // Confirm the category has live products for this gender. Without this a
  // made-up slug like /category/women-anything would render a valid-looking
  // page with nothing in it.
  try {
    const live = await fetchNavCategories(parsed.gender);
    const known =
      live.some((c) => c.slug === slug) ||
      live.some((c) => c.slug === `${parsed.gender}-${parsed.category}`);
    if (!known && !legacy) return { notFound: true };
  } catch {
    // API down at build time — fall through and render. The listing itself
    // fetches client-side, so an empty result is handled there.
  }

  return {
    props: {
      slug,
      category: parsed.category,
      gender: parsed.gender,
      title: legacy?.title ?? titleCase(parsed.category),
    },
    // The catalogue's category set changes when products are added or hidden.
    revalidate: 300,
  };
};

export default function CategoryPage({
  slug,
  category,
  gender,
  title,
}: CategoryPageProps) {
  const genderLabel = gender === "women" ? "Women" : "Men";
  const label = `${title} — ${genderLabel}`;
  return (
    <>
      <SEO
        title={`${label} — Jakalburg`}
        description={`Shop ${label.toLowerCase()} at Jakalburg.`}
        canonicalPath={`/category/${slug}`}
      />
      <SiteLayout>
        <CollectionView
          eyebrow={genderLabel}
          title={title}
          filters={{ category, gender }}
        />
      </SiteLayout>
    </>
  );
}
