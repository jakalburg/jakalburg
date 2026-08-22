import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { faqs } from "@/data/faqs";

export default function FaqPage() {
  return (
    <>
      <SEO
        title="Help & FAQ — Jakalburg"
        description="Frequently asked questions about orders, shipping, returns, sizing and care."
        canonicalPath="/faq"
      />
      <SiteLayout>
        <section className="container-vh py-16">
          <p className="eyebrow text-mute-text">Help</p>
          <h1 className="mt-3 text-3xl md:text-4xl">Frequently asked.</h1>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {faqs.map((section) => (
              <div key={section.section}>
                <h2 className="mb-4 text-lg">{section.section}</h2>
                <Accordion type="single" collapsible>
                  {section.items.map((f, i) => (
                    <AccordionItem key={i} value={`${section.section}-${i}`}>
                      <AccordionTrigger>{f.question}</AccordionTrigger>
                      <AccordionContent>{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
