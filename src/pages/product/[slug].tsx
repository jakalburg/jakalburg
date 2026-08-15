import { useEffect, useState } from "react";
import type { GetStaticPaths, GetStaticProps } from "next";
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
import { findProduct, products, productsByIds } from "@/data/products";
import { formatINR } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { add_cart_product } from "@/redux/features/cart-slice";
import { setCartOpen } from "@/redux/features/ui-slice";
import { selectWishlistIds, toggle_wishlist } from "@/redux/features/wishlist-slice";
import { selectRecentlyViewedIds, push_recently_viewed } from "@/redux/features/recently-viewed-slice";
import { useHydrated } from "@/hooks/useHydrated";
import type { Product } from "@/types";

export const getStaticPaths: GetStaticPaths = () => ({
  paths: products.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ product: Product }> = ({ params }) => {
  const product = findProduct(String(params?.slug));
  if (!product) return { notFound: true };
  return { props: { product } };
};

export default function ProductDetail({ product }: { product: Product }) {
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();
  const wishHas = useAppSelector(selectWishlistIds).includes(product.id);
  const recentIds = useAppSelector(selectRecentlyViewedIds);

  useEffect(() => {
    // Push after mount so we don't run on the server.
    dispatch(push_recently_viewed(product.id));
  }, [product.id, dispatch]);

  const isBottom = ["trousers", "jeans", "shorts"].includes(product.category);
  const soldOut = product.soldOutSizes ?? [];

  const onAdd = () => {
    if (!size) {
      toast.error("Please select a size");
      return;
    }
    dispatch(add_cart_product({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0],
      price: product.price,
      size,
      color,
      quantity: 1,
    }));
    toast.success("Added to bag");
    dispatch(setCartOpen(true));
  };

  const related = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.collection === product.collection))
    .slice(0, 4);

  const recentlyViewed = productsByIds(recentIds.filter((id) => id !== product.id)).slice(0, 4);

  return (
    <>
      <SEO
        title={`${product.title} — Jakalburg`}
        description={product.description}
        image={product.images[0]}
        canonicalPath={`/product/${product.slug}`}
        type="product"
      />
      <SiteLayout>
        <section className="container-vh grid gap-10 py-10 lg:grid-cols-2">
          <ProductGallery images={product.images} alt={product.title} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow text-mute-text">{product.gender}</p>
            <h1 className="mt-2 text-2xl md:text-3xl">{product.title}</h1>
            <div className="mt-3 flex items-baseline gap-3">
              <p className="text-lg">{formatINR(product.price)}</p>
              {product.compareAtPrice && (
                <p className="text-sm text-mute-text line-through">{formatINR(product.compareAtPrice)}</p>
              )}
            </div>
            <p className="mt-6 max-w-md text-sm text-muted-foreground">{product.description}</p>

            <div className="mt-8 space-y-6">
              <ColorSelector colors={product.colors} value={color} onChange={setColor} />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="eyebrow text-mute-text">Size</p>
                  <SizeGuide kind={isBottom ? "bottoms" : "tops"} />
                </div>
                <SizeSelector sizes={product.sizes} soldOut={soldOut} value={size} onChange={setSize} />
              </div>
              <div className="flex gap-2">
                <Button size="lg" className="flex-1" onClick={onAdd}>Add to bag</Button>
                <Button
                  size="lg"
                  variant="outline"
                  aria-label={hydrated && wishHas ? "Remove from wishlist" : "Save to wishlist"}
                  onClick={() => dispatch(toggle_wishlist(product.id))}
                >
                  <Heart className={`size-4 ${hydrated && wishHas ? "fill-current" : ""}`} aria-hidden="true" />
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

        {related.length > 0 && (
          <section className="container-vh py-16">
            <h2 className="mb-8 text-xl md:text-2xl">You may also like</h2>
            <ProductGrid products={related} />
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
