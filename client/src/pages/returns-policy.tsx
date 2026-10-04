import { PolicyPage } from "@/components/common/policy-page";
import { StaticPage, fetchStaticPage } from "@/hooks/useStaticPage";

const SLUG = "returns-policy";

// Copy shown if the API is unreachable or an admin deactivates the page —
// matches what this route rendered before it became editable.
const FALLBACK = [
  "<p>Unworn pieces with tags may be returned within 30 days for a full refund, or exchanged for a different size or colour where stock permits.</p>",
  "<h2>How</h2>",
  "<p>Start a return from your account (or by emailing care@jakalburg.example) and we&rsquo;ll email a prepaid pickup label.</p>",
  "<h2>Exceptions</h2>",
  "<p>Final-sale items are clearly marked on the product page and cannot be returned.</p>",
].join("");

export async function getStaticProps() {
  return {
    props: { initialPage: await fetchStaticPage(SLUG) },
    revalidate: 60,
  };
}

export default function ReturnsPolicyPage({
  initialPage,
}: {
  initialPage: StaticPage | null;
}) {
  return (
    <PolicyPage
      slug={SLUG}
      eyebrow="Policy"
      seoTitle="Returns — Jakalburg"
      seoDescription="How to return or exchange a Jakalburg piece."
      canonicalPath="/returns-policy"
      fallbackTitle="Returns & exchanges."
      fallbackContent={FALLBACK}
      initialPage={initialPage}
    />
  );
}
