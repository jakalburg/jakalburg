import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";

export default function ReturnsPolicyPage() {
  return (
    <>
      <SEO
        title="Returns — Jakalburg"
        description="How to return or exchange a Jakalburg piece."
        canonicalPath="/returns-policy"
      />
      <SiteLayout>
        <section className="container-vh max-w-3xl py-16">
          <p className="eyebrow text-mute-text">Policy</p>
          <h1 className="mt-3 text-3xl md:text-4xl">Returns & exchanges.</h1>
          <div className="prose mt-8 max-w-none text-sm text-muted-foreground">
            <p>Unworn pieces with tags may be returned within 30 days for a full refund, or exchanged for a different size or colour where stock permits.</p>
            <h2 className="mt-6 text-base text-foreground">How</h2>
            <p>Start a return from your account (or by emailing care@jakalburg.example) and we&apos;ll email a prepaid pickup label.</p>
            <h2 className="mt-6 text-base text-foreground">Exceptions</h2>
            <p>Final-sale items are clearly marked on the product page and cannot be returned.</p>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
