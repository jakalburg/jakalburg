import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { StaticPage, useStaticPage } from "@/hooks/useStaticPage";

/**
 * Shared shell for the admin-editable policy pages (Shipping, Returns,
 * Privacy, Terms). Keeps the storefront's typography — eyebrow, heading, and a
 * `.prose` body — and drops the admin's rich text into the body slot.
 *
 * `content` HTML is sanitised server-side at the write boundary (see
 * PagesService), so what arrives here is already limited to the tag set the
 * Quill editor can produce.
 *
 * `fallbackTitle` / `fallbackContent` render when the API is unreachable or an
 * admin has set the page inactive, so the route never shows an empty shell.
 */
export function PolicyPage({
  slug,
  eyebrow,
  seoTitle,
  seoDescription,
  canonicalPath,
  fallbackTitle,
  fallbackContent,
  initialPage,
}: {
  slug: string;
  eyebrow: string;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  fallbackTitle: string;
  fallbackContent: string;
  initialPage: StaticPage | null;
}) {
  const { data: page } = useStaticPage(slug, initialPage ?? undefined);

  const heading = page?.title?.trim() || fallbackTitle;
  const body = page?.content?.trim() || fallbackContent;

  return (
    <>
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonicalPath={canonicalPath}
      />
      <SiteLayout>
        <section className="container-vh max-w-3xl py-16">
          <p className="eyebrow text-mute-text">{eyebrow}</p>
          <h1 className="mt-3 text-3xl md:text-4xl">{heading}</h1>
          <div
            className="prose prose-headings:mt-6 prose-headings:text-base prose-headings:text-foreground mt-8 max-w-none text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        </section>
      </SiteLayout>
    </>
  );
}
