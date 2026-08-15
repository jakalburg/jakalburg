import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/stores/wishlist";
import { useHydrated } from "@/hooks/useHydrated";
import { productsByIds } from "@/data/products";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Jakalburg" },
      { name: "description", content: "Pieces you've saved for later." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const hydrated = useHydrated();
  const ids = useWishlistStore((s) => s.ids);
  const items = productsByIds(ids);
  return (
    <SiteLayout>
      <section className="container-vh py-12">
        <p className="eyebrow text-mute-text">Wishlist</p>
        <h1 className="mt-2 text-3xl">Saved for later</h1>
        {hydrated && items.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-mute-text">You haven't saved anything yet.</p>
            <Button asChild><Link to="/new-arrivals">Start browsing</Link></Button>
          </div>
        )}
        {hydrated && items.length > 0 && <div className="mt-10"><ProductGrid products={items} /></div>}
      </section>
    </SiteLayout>
  );
}
