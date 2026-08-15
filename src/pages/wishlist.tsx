import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/redux/hooks";
import { selectWishlistIds } from "@/redux/features/wishlist-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { productsByIds } from "@/data/products";

export default function WishlistPage() {
  const hydrated = useHydrated();
  const ids = useAppSelector(selectWishlistIds);
  const items = productsByIds(ids);
  return (
    <>
      <SEO title="Wishlist — Jakalburg" description="Pieces you've saved for later." noIndex />
      <SiteLayout>
        <section className="container-vh py-12">
          <p className="eyebrow text-mute-text">Wishlist</p>
          <h1 className="mt-2 text-3xl">Saved for later</h1>
          {hydrated && items.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-mute-text">You haven&apos;t saved anything yet.</p>
              <Button asChild><Link href="/new-arrivals">Start browsing</Link></Button>
            </div>
          )}
          {hydrated && items.length > 0 && <div className="mt-10"><ProductGrid products={items} /></div>}
        </section>
      </SiteLayout>
    </>
  );
}
