import { PolicyPage } from "@/components/common/policy-page";
import { StaticPage, fetchStaticPage } from "@/hooks/useStaticPage";

const SLUG = "terms";

// Copy shown if the API is unreachable or an admin deactivates the page —
// matches what this route rendered before it became editable.
const FALLBACK = [
  "<p>This is a demonstration site. No transactions are processed and no goods are shipped. Use the site to explore the design and interaction only.</p>",
  "<p>All imagery is used under royalty-free licence and is representative rather than of specific product samples.</p>",
].join("");

export async function getStaticProps() {
  return {
    props: { initialPage: await fetchStaticPage(SLUG) },
    revalidate: 60,
  };
}

export default function TermsPage({
  initialPage,
}: {
  initialPage: StaticPage | null;
}) {
  return (
    <PolicyPage
      slug={SLUG}
      eyebrow="Legal"
      seoTitle="Terms — Jakalburg"
      seoDescription="Terms of use for the Jakalburg demo storefront."
      canonicalPath="/terms"
      fallbackTitle="Terms of use."
      fallbackContent={FALLBACK}
      initialPage={initialPage}
    />
  );
}
