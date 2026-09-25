import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "sonner";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ColorSelector } from "@/components/product/ColorSelector";
import { SizeSelector } from "@/components/product/SizeSelector";
import { SizeGuide } from "@/components/product/SizeGuide";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Heart } from "lucide-react";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { RatingSummary } from "@/components/reviews/StarRating";
import { useProduct, useRelatedProducts, useProductsPage } from "@/hooks/useProducts";
import { formatINR } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { add_cart_product } from "@/redux/features/cart-slice";
import { setCartOpen } from "@/redux/features/ui-slice";
import { selectWishlistIds, toggle_wishlist } from "@/redux/features/wishlist-slice";
import { selectRecentlyViewedIds, push_recently_viewed } from "@/redux/features/recently-viewed-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import type { Product } from "@/types";

/** Products shown in the "recently viewed" row. */
const RECENTLY_VIEWED_MAX = 4;

export default function ProductDetailPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : undefined;
  const { data: product, isLoading, isError } = useProduct(slug);

  if (!router.isReady || isLoading) {
    return (
      <>
        <SEO title="Loading… — Jakalburg" description="" noIndex />
        <SiteLayout>
          <section className="container-vh grid gap-10 py-10 lg:grid-cols-2">
            <div className="aspect-[4/5] w-full animate-pulse bg-stone" />
            <div className="space-y-4">
              <div className="h-3 w-24 animate-pulse bg-stone" />
              <div className="h-6 w-2/3 animate-pulse bg-stone" />
              <div className="h-4 w-1/4 animate-pulse bg-stone" />
              <div className="h-24 w-full animate-pulse bg-stone" />
            </div>
          </section>
        </SiteLayout>
      </>
    );
  }

  if (isError || !product) {
    return (
      <>
        <SEO title="Not found — Jakalburg" description="" noIndex />
        <SiteLayout>
          <section className="container-vh flex flex-col items-center gap-4 py-24 text-center">
            <h1 className="text-2xl">This piece couldn&apos;t be found</h1>
            <p className="text-sm text-mute-text">It may have sold out or the link is out of date.</p>
            <Button asChild><Link href="/new-arrivals">Browse new arrivals</Link></Button>
          </section>
        </SiteLayout>
      </>
    );
  }

  // Remount per slug so selected colour/size reset when navigating between products.
  return <ProductDetailView key={product.slug} product={product} />;
}

function ProductDetailView({ product }: { product: Product }) {
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [size, setSize] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const requireAuth = useRequireAuth();
  const wishHas = useAppSelector(selectWishlistIds).includes(product.id);
  const recentIds = useAppSelector(selectRecentlyViewedIds);

  const { data: related = [], isLoading: relatedLoading } = useRelatedProducts(product.slug);
  // Recently viewed: fetch just the saved ids rather than the catalogue.
  // Capped at RECENTLY_VIEWED_MAX, which is all the row renders anyway.
  const recentlyViewedIds = recentIds
    .filter((id) => id !== product.id)
    .slice(0, RECENTLY_VIEWED_MAX);
  const { data: recentlyViewedPage } = useProductsPage(
    { ids: recentlyViewedIds, limit: RECENTLY_VIEWED_MAX },
    { enabled: recentlyViewedIds.length > 0 },
  );

  useEffect(() => {
    // Push after mount so we don't run on the server.
    dispatch(push_recently_viewed(product.id));
  }, [product.id, dispatch]);

  const isBottom = ["trousers", "jeans", "shorts"].includes(product.category);

  // Resolve the selected colour to a full variant. Any field the colour leaves
  // blank inherits the product-level default, so single-colour / legacy
  // products behave exactly as before.
  const colorObj = product.colors.find((c) => c.name === color);
  const usesColorSizes = (colorObj?.sizes?.length ?? 0) > 0;
  const images = colorObj?.images?.length ? colorObj.images : product.images;
  const sizes = usesColorSizes ? colorObj!.sizes! : product.sizes;
  // Sold-out set must pair with whichever size run is shown: the colour's own
  // set when it has one; the product's only while inheriting the product sizes.
  const soldOut =
    (colorObj?.soldOutSizes?.length
      ? colorObj.soldOutSizes
      : usesColorSizes
        ? []
        : product.soldOutSizes) ?? [];
  const price = colorObj?.price ?? product.price;
  const compareAtPrice = colorObj?.compareAtPrice ?? product.compareAtPrice;

  // Switching colour keeps the chosen size only if the new colour still offers
  // it; otherwise it clears so the shopper re-picks from that colour's run.
  const handleColorChange = (name: string) => {
    setColor(name);
    const next = product.colors.find((c) => c.name === name);
    const nextSizes = next?.sizes?.length ? next.sizes : product.sizes;
    setSize((prev) => (prev && nextSizes.includes(prev) ? prev : null));
  };

  const onAdd = () => {
    requireAuth(() => {
      if (!size) {
        toast.error("Please select a size");
        return;
      }
      dispatch(add_cart_product({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: images[0],
        price,
        size,
        color,
        quantity: 1,
      }));
      toast.success("Added to bag");
      dispatch(setCartOpen(true));
    });
  };

  // Restore the most-recent-first order the ids came in.
  const recentlyViewedById = new Map(
    (recentlyViewedPage?.data ?? []).map((p) => [p.id, p]),
  );
  const recentlyViewed = recentlyViewedIds
    .map((id) => recentlyViewedById.get(id))
    .filter((p): p is Product => Boolean(p));

  return (
    <>
      <SEO
        title={`${product.title} — Jakalburg`}
        description={product.description}
        image={images[0]}
        canonicalPath={`/product/${product.slug}`}
        type="product"
      />
      <SiteLayout>
        <section className="container-vh grid gap-10 py-10 lg:grid-cols-2">
          {/* key={color} resets the gallery's active index when the colour's
              image set changes, so it never points past the new array. */}
          <ProductGallery key={color} images={images} alt={product.title} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow text-mute-text">{product.gender}</p>
            <h1 className="mt-2 text-2xl md:text-3xl">{product.title}</h1>
            {/* Renders nothing until the product has an approved review — see
                RatingSummary. Links down to the section rather than repeating it.
                Skipped entirely when an admin has hidden reviews for this product. */}
            {!product.reviewsHidden && (
              <a href="#reviews" className="mt-2 inline-block hover:underline">
                <RatingSummary average={product.avgRating} count={product.reviewCount} />
              </a>
            )}
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-lg">{formatINR(price)}</p>
              {compareAtPrice && (
                <p className="text-sm text-mute-text line-through">{formatINR(compareAtPrice)}</p>
              )}
            </div>
            <p className="mt-6 max-w-md text-sm text-muted-foreground">{product.description}</p>

            <div className="mt-8 space-y-6">
              <ColorSelector colors={product.colors} value={color} onChange={handleColorChange} />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Size</p>
                  <SizeGuide kind={isBottom ? "bottoms" : "tops"} />
                </div>
                <SizeSelector sizes={sizes} soldOut={soldOut} value={size} onChange={setSize} />
              </div>
              <div className="flex gap-2">
                <Button size="lg" className="flex-1" onClick={onAdd}>Add to bag</Button>
                {/* Always `outline` — the container never changes. Wishlist
                    state is carried entirely by the heart: solid red when saved,
                    outline otherwise, matching ProductCard. */}
                <Button
                  size="lg"
                  variant="outline"
                  aria-label={hydrated && wishHas ? "Remove from wishlist" : "Save to wishlist"}
                  onClick={() =>
                    requireAuth(() => {
                      dispatch(toggle_wishlist(product.id));
                      toast.success(wishHas ? "Removed from wishlist" : "Added to wishlist");
                    })
                  }
                >
                  <Heart
                    className={`size-4 transition-colors ${hydrated && wishHas ? "text-red-500" : "text-foreground"}`}
                    style={{ fill: hydrated && wishHas ? "currentColor" : "none" }}
                    aria-hidden="true"
                  />
                </Button>
              </div>
            </div>

            <Accordion type="single" collapsible className="mt-10">
              <AccordionItem value="fabric">
                <AccordionTrigger>Fabric & care</AccordionTrigger>
                <AccordionContent>
                  <p><span className="font-medium">Fabric:</span> {product.fabric}</p>
                  <p className="mt-1"><span className="font-medium">Care:</span> {product.care}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="ship">
                <AccordionTrigger>Shipping & returns</AccordionTrigger>
                <AccordionContent>
                  Free standard shipping on orders over ₹2,499. Easy 30-day returns on unworn pieces with tags.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {!product.reviewsHidden && (
          <div id="reviews" className="scroll-mt-24">
            <ProductReviews slug={product.slug} />
          </div>
        )}

        {(relatedLoading || related.length > 0) && (
          <section className="container-vh py-16">
            <h2 className="mb-8 text-xl md:text-2xl">You may also like</h2>
            <ProductGrid products={related} isLoading={relatedLoading} skeletonCount={4} />
          </section>
        )}

        {hydrated && recentlyViewed.length > 0 && (
          <section className="container-vh py-16">
            <h2 className="mb-8 text-xl md:text-2xl">Recently viewed</h2>
            <ProductGrid products={recentlyViewed} />
          </section>
        )}
      </SiteLayout>
    </>
  );
}
