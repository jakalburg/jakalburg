import { PolicyPage } from "@/components/common/policy-page";
import { StaticPage, fetchStaticPage } from "@/hooks/useStaticPage";

const SLUG = "privacy-policy";

// Copy shown if the API is unreachable or an admin deactivates the page —
// matches what this route rendered before it became editable.
const FALLBACK = [
  "<p>This is a demo storefront. No personal data is transmitted to any server — everything you enter is kept in your browser&rsquo;s local storage only, and can be cleared by clearing site data.</p>",
  "<p>A production Jakalburg store would collect the minimum data needed to fulfil your order (name, address, contact, order history) and never share it with third parties beyond our shipping partners.</p>",
].join("");

export async function getStaticProps() {
  return {
    props: { initialPage: await fetchStaticPage(SLUG) },
    revalidate: 60,
  };
}

export default function PrivacyPolicyPage({
  initialPage,
}: {
  initialPage: StaticPage | null;
}) {
  return (
    <PolicyPage
      slug={SLUG}
      eyebrow="Policy"
      seoTitle="Privacy — Jakalburg"
      seoDescription="How Jakalburg handles your data."
      canonicalPath="/privacy-policy"
      fallbackTitle="Privacy."
      fallbackContent={FALLBACK}
      initialPage={initialPage}
    />
  );
}
