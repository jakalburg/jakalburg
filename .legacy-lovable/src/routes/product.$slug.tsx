import { useEffect, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
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
import { useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";
import { useRecentlyViewedStore } from "@/stores/recentlyViewed";
import { useHydrated } from "@/hooks/useHydrated";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = findProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Product not found — Jakalburg" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.product;
    return {
      meta: [
        { title: `${p.title} — Jakalburg` },
        { name: "description", content: p.description },
        { property: "og:title", content: `${p.title} — Jakalburg` },
        { property: "og:description", content: p.description },
        { property: "og:image", content: p.images[0] },
        { property: "og:url", content: `/product/${params.slug}` },
        { property: "og:type", content: "product" },
      ],
      links: [{ rel: "canonical", href: `/product/${params.slug}` }],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product } = Route.useLoaderData();
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState<string | null>(null);
  const add = useCartStore((s) => s.add);
  const openCart = useUIStore((s) => s.setCartOpen);
  const hydrated = useHydrated();
  const wishHas = useWishlistStore((s) => s.ids.includes(product.id));
  const wishToggle = useWishlistStore((s) => s.toggle);
  const pushRecent = useRecentlyViewedStore((s) => s.push);
  const recentIds = useRecentlyViewedStore((s) => s.ids);

  useEffect(() => {
    // Push after mount so we don't run on the server.
    pushRecent(product.id);
  }, [product.id, pushRecent]);

  const isBottom = ["trousers", "jeans", "shorts"].includes(product.category);
  const soldOut = product.soldOutSizes ?? [];

  const onAdd = () => {
    if (!size) {
      toast.error("Please select a size");
      return;
    }
    add({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0],
      price: product.price,
      size,
      color,
      quantity: 1,
    });
    toast.success("Added to bag");
    openCart(true);
  };

  const related = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.collection === product.collection))
    .slice(0, 4);

  const recentlyViewed = productsByIds(recentIds.filter((id) => id !== product.id)).slice(0, 4);

  return (
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
                onClick={() => wishToggle(product.id)}
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
  );
}
