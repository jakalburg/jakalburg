import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/data/faqs";
import {
  FaqSection,
  StaticPage,
  fetchStaticPage,
  useStaticPage,
} from "@/hooks/useStaticPage";

const SLUG = "faq";

// Built-in copy, used when the API is unreachable or an admin deactivates the
// page. Shaped to match the admin's structure (a heading, then its Q&A).
const FALLBACK: FaqSection[] = faqs.map((section) => ({
  heading: section.section,
  items: section.items,
}));

export async function getStaticProps() {
  return {
    props: { initialPage: await fetchStaticPage(SLUG) },
    revalidate: 60,
  };
}

export default function FaqPage({
  initialPage,
}: {
  initialPage: StaticPage | null;
}) {
  const { data: page } = useStaticPage(SLUG, initialPage ?? undefined);

  // Each heading from the admin becomes its own group with an accordion of the
  // questions filed under it.
  const sections = page?.faqSections?.length ? page.faqSections : FALLBACK;
  const heading = page?.title?.trim() || "Frequently asked.";

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
          <h1 className="mt-3 text-3xl md:text-4xl">{heading}</h1>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            {sections.map((section, sectionIndex) => (
              <div key={`${section.heading}-${sectionIndex}`}>
                <h2 className="mb-4 text-lg">{section.heading}</h2>
                <Accordion type="single" collapsible>
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem
                      key={itemIndex}
                      value={`${sectionIndex}-${itemIndex}`}
                    >
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent>{item.answer}</AccordionContent>
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
