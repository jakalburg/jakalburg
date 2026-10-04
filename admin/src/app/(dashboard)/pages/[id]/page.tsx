"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";
import { usePage } from "@/hooks/use-pages";
import { useSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const replacePlaceholders = (
  content: string,
  settings?: {
    storeName?: string;
    storeEmail?: string;
    storePhone?: string;
    storeAddress?: string;
    storeMapLink?: string;
  },
) => {
  if (!content) return "";

  let nextContent = content;

  nextContent = nextContent.replace(
    /{{storeName}}/g,
    settings?.storeName || "Our Store",
  );
  nextContent = nextContent.replace(
    /{{storeEmail}}/g,
    settings?.storeEmail || "contact@example.com",
  );
  nextContent = nextContent.replace(
    /{{storePhone}}/g,
    settings?.storePhone || "",
  );
  nextContent = nextContent.replace(
    /{{storeAddress}}/g,
    settings?.storeAddress || "",
  );

  const mapHtml = settings?.storeMapLink
    ? `<div class="store-map-container"><iframe src="${settings.storeMapLink}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
    : "";

  return nextContent.replace(/{{storeMap}}/g, mapHtml);
};

export default function ViewPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: page, isLoading } = usePage(id);
  const { data: settings } = useSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Page not found</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            The requested static page does not exist.
          </p>
          <Button asChild>
            <Link href="/website/pages">Back to Static Pages</Link>
          </Button>
        </div>
      </div>
    );
  }

  const previewContent = replacePlaceholders(page.content || "", settings);
  // The FAQ page stores its Q&A in `faqSections`, not `content` — previewing
  // `content` for it would render an empty box.
  const faqSections = page.faqSections ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/website/pages">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
            <p className="text-muted-foreground mt-1">/{page.slug}</p>
          </div>
        </div>

        <Button asChild>
          <Link href={`/pages/${page.id}/edit`}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Page Details</CardTitle>
          <Badge
            variant={page.status === "active" ? "default" : "secondary"}
            className={cn(
              page.status === "active"
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-gray-100 text-gray-700 hover:bg-gray-100",
            )}
          >
            {page.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Content Preview</h3>
            {faqSections.length > 0 ? (
              <div className="min-h-[200px] space-y-6 rounded-md border p-4">
                {faqSections.map((section, sectionIndex) => (
                  <div key={sectionIndex}>
                    <h4 className="font-semibold">{section.heading}</h4>
                    <dl className="mt-3 space-y-3">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex}>
                          <dt className="text-sm font-medium">
                            {item.question}
                          </dt>
                          <dd className="text-sm text-muted-foreground">
                            {item.answer}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="page-preview-content ql-editor min-h-[200px] rounded-md border p-4"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            )}
            <style jsx>{`
              .page-preview-content {
                overflow: visible;
                white-space: normal;
                line-height: 1.7;
                font-size: 0.95rem;
                color: var(--foreground);
                padding: 1.25rem;
              }

              .page-preview-content :global(h1),
              .page-preview-content :global(h2),
              .page-preview-content :global(h3),
              .page-preview-content :global(h4),
              .page-preview-content :global(h5),
              .page-preview-content :global(h6) {
                margin: 1.5em 0 0.5em;
                font-weight: 700;
                line-height: 1.25;
                color: var(--foreground);
              }

              .page-preview-content :global(h1) {
                font-size: 2.1rem;
              }

              .page-preview-content :global(h2) {
                font-size: 1.75rem;
                border-bottom: 1px solid var(--border);
                padding-bottom: 0.5rem;
              }

              .page-preview-content :global(h3) {
                font-size: 1.4rem;
              }

              .page-preview-content :global(h4) {
                font-size: 1.15rem;
              }

              .page-preview-content :global(p),
              .page-preview-content :global(blockquote),
              .page-preview-content :global(ul),
              .page-preview-content :global(ol),
              .page-preview-content :global(pre),
              .page-preview-content :global(table) {
                margin: 0 0 1rem;
              }

              .page-preview-content :global(strong) {
                font-weight: 700;
              }

              .page-preview-content :global(a) {
                color: var(--primary);
                text-decoration: underline;
              }

              .page-preview-content :global(ul),
              .page-preview-content :global(ol) {
                padding-left: 1.5rem;
              }

              .page-preview-content :global(ul) {
                list-style: disc;
              }

              .page-preview-content :global(ol) {
                list-style: decimal;
              }

              .page-preview-content :global(li) {
                margin-bottom: 0.5rem;
              }

              .page-preview-content :global(li[data-list="bullet"]) {
                list-style: disc;
              }

              .page-preview-content :global(li[data-list="ordered"]) {
                list-style: decimal;
              }

              .page-preview-content :global(li.ql-indent-1) {
                margin-left: 1.5rem;
              }

              .page-preview-content :global(li.ql-indent-2) {
                margin-left: 3rem;
              }

              .page-preview-content :global(li.ql-indent-3) {
                margin-left: 4.5rem;
              }

              .page-preview-content :global(.ql-align-center) {
                text-align: center;
              }

              .page-preview-content :global(.ql-align-right) {
                text-align: right;
              }

              .page-preview-content :global(.ql-align-justify) {
                text-align: justify;
              }

              .page-preview-content :global(blockquote) {
                border-left: 4px solid var(--primary);
                background: var(--muted);
                padding: 1rem 1.25rem;
                font-style: italic;
              }

              .page-preview-content :global(img) {
                display: block;
                width: auto !important;
                max-width: min(420px, 100%) !important;
                max-height: 320px !important;
                height: auto !important;
                object-fit: contain;
                margin: 1.25rem auto;
                border-radius: 0.75rem;
              }

              .page-preview-content :global(table) {
                width: 100%;
                border-collapse: collapse;
              }

              .page-preview-content :global(th),
              .page-preview-content :global(td) {
                border: 1px solid var(--border);
                padding: 0.75rem;
                text-align: left;
              }

              .page-preview-content :global(pre) {
                overflow-x: auto;
                border-radius: 0.75rem;
                background: var(--muted);
                padding: 1rem;
              }

              .page-preview-content :global(.store-map-container) {
                position: relative;
                overflow: hidden;
                padding-top: 56.25%;
                border-radius: 1rem;
              }

              .page-preview-content :global(.store-map-container iframe) {
                position: absolute;
                inset: 0;
                width: 100%;
                height: 100%;
                border: 0;
              }

              .page-preview-content :global(.policy-wrapper) {
                max-width: 1200px;
                margin: 0 auto;
              }

              .page-preview-content :global(.last-updated) {
                display: block;
                margin-bottom: 1.5rem;
                color: var(--muted-foreground);
                font-size: 0.875rem;
                font-style: italic;
              }

              .page-preview-content :global(.founder-page) {
                max-width: 1180px;
                margin: 0 auto;
              }

              .page-preview-content :global(.founder-page__hero) {
                display: grid;
                grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
                gap: 2.5rem;
                align-items: center;
                margin-bottom: 2.5rem;
              }

              .page-preview-content :global(.founder-page__media img) {
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                aspect-ratio: 4 / 5;
                object-fit: cover;
                margin: 0;
                box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
              }

              .page-preview-content :global(.founder-page__eyebrow) {
                display: inline-block;
                margin-bottom: 0.75rem;
                font-size: 0.75rem;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: var(--primary);
              }

              .page-preview-content :global(.founder-page__content h2),
              .page-preview-content :global(.founder-page__details h3) {
                margin-top: 0;
              }

              @media (max-width: 900px) {
                .page-preview-content :global(.founder-page__hero) {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
