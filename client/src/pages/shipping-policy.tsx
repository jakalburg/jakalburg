import { PolicyPage } from "@/components/common/policy-page";
import { StaticPage, fetchStaticPage } from "@/hooks/useStaticPage";

const SLUG = "shipping-policy";

// Copy shown if the API is unreachable or an admin deactivates the page —
// matches what this route rendered before it became editable.
const FALLBACK = [
  "<p>We ship across India via trusted couriers.</p>",
  "<h2>Timelines</h2>",
  "<p>Standard shipping arrives in 3–5 business days. Express arrives in 1–2 business days. Both are tracked door-to-door.</p>",
  "<h2>Cost</h2>",
  "<p>Standard shipping is complimentary on orders over ₹2,499. Express is ₹199 flat. International shipping is calculated at checkout.</p>",
  "<h2>Packaging</h2>",
  "<p>We ship in recycled, recyclable mailers with cotton tape and a printed care note.</p>",
].join("");

// Fetch the admin-edited copy at build/ISR time so the first paint is real.
export async function getStaticProps() {
  return {
    props: { initialPage: await fetchStaticPage(SLUG) },
    revalidate: 60,
  };
}

export default function ShippingPolicyPage({
  initialPage,
}: {
  initialPage: StaticPage | null;
}) {
  return (
    <PolicyPage
      slug={SLUG}
      eyebrow="Policy"
      seoTitle="Shipping — Jakalburg"
      seoDescription="Shipping options, timelines and costs."
      canonicalPath="/shipping-policy"
      fallbackTitle="Shipping."
      fallbackContent={FALLBACK}
      initialPage={initialPage}
    />
  );
}
