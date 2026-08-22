import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";

export default function NotFoundPage() {
  return (
    <>
      <SEO pageTitle="Page not found" noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
          <p className="eyebrow text-mute-text">Error 404</p>
          <h1 className="mt-3 text-4xl md:text-5xl">This page can&apos;t be found.</h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            The page you&apos;re after may have moved or the link may be out of date.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Go home
            </Link>
            <Link
              href="/new-arrivals"
              className="inline-flex items-center justify-center border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              Shop new arrivals
            </Link>
          </div>
        </section>
      </SiteLayout>
    </>
  );
}
