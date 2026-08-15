import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { collections } from "@/data/collections";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Collections — Jakalburg" },
      { name: "description", content: "Edited collections from Jakalburg — from summer essentials to atelier tailoring." },
      { property: "og:title", content: "Collections — Jakalburg" },
      { property: "og:url", content: "/collections" },
    ],
    links: [{ rel: "canonical", href: "/collections" }],
  }),
  component: CollectionsIndex,
});

function CollectionsIndex() {
  return (
    <SiteLayout>
      <section className="container-vh py-10">
        <header className="mb-10">
          <p className="eyebrow text-mute-text">Collections</p>
          <h1 className="mt-2 text-3xl md:text-4xl">Edited by mood.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Small, focused capsules — grouped by fabric, silhouette, or occasion.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link
              key={c.slug}
              to="/collections/$slug"
              params={{ slug: c.slug }}
              className="group block"
            >
              <div className="aspect-[4/5] overflow-hidden bg-stone">
                <img
                  src={c.image}
                  alt={c.title}
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              </div>
              <div className="mt-3">
                <p className="text-lg font-medium">{c.title}</p>
                <p className="text-sm text-mute-text">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
