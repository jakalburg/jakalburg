import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";

export default function ShippingPolicyPage() {
  return (
    <>
      <SEO
        title="Shipping — Jakalburg"
        description="Shipping options, timelines and costs."
        canonicalPath="/shipping-policy"
      />
      <SiteLayout>
        <section className="container-vh max-w-3xl py-16">
          <p className="eyebrow text-mute-text">Policy</p>
          <h1 className="mt-3 text-3xl md:text-4xl">Shipping.</h1>
          <div className="prose mt-8 max-w-none text-sm text-muted-foreground">
            <p>We ship across India via trusted couriers.</p>
            <h2 className="mt-6 text-base text-foreground">Timelines</h2>
            <p>Standard shipping arrives in 3–5 business days. Express arrives in 1–2 business days. Both are tracked door-to-door.</p>
            <h2 className="mt-6 text-base text-foreground">Cost</h2>
            <p>Standard shipping is complimentary on orders over ₹2,499. Express is ₹199 flat. International shipping is calculated at checkout.</p>
            <h2 className="mt-6 text-base text-foreground">Packaging</h2>
            <p>We ship in recycled, recyclable mailers with cotton tape and a printed care note.</p>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
