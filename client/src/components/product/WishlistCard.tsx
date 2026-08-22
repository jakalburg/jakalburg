import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/redux/hooks";
import { add_cart_product } from "@/redux/features/cart-slice";
import { toggle_wishlist } from "@/redux/features/wishlist-slice";
import { setCartOpen } from "@/redux/features/ui-slice";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";

// A wishlist-screen card: unlike the catalogue ProductCard it carries the
// actions you want on saved items — pick a size/colour, move the piece into the
// bag (adds to cart and drops it from the wishlist), or just remove it.
export function WishlistCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const requireAuth = useRequireAuth();
  const soldOut = product.soldOutSizes ?? [];
  const available = product.sizes.filter((s) => !soldOut.includes(s));
  const allSoldOut = available.length === 0;

  const [size, setSize] = useState<string | null>(available[0] ?? null);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");

  const remove = () => dispatch(toggle_wishlist(product.id));

  const moveToBag = () => {
    requireAuth(() => {
      if (!size) {
        toast.error("Please select a size");
        return;
      }
      dispatch(
        add_cart_product({
          productId: product.id,
          slug: product.slug,
          title: product.title,
          image: product.images[0],
          price: product.price,
          size,
          color,
          quantity: 1,
        }),
      );
      // "Move" — leave the wishlist once it's in the bag.
      dispatch(toggle_wishlist(product.id));
      toast.success("Moved to bag");
      dispatch(setCartOpen(true));
    });
  };

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone">
        <Link href={`/product/${product.slug}`} aria-label={product.title} className="block h-full w-full">
          <ImageShimmer
            src={product.images[0]}
            alt={product.title}
            wrapperClassName="h-full w-full transition duration-700 group-hover:scale-[1.02]"
          />
        </Link>
        <button
          type="button"
          aria-label={`Remove ${product.title} from wishlist`}
          onClick={remove}
          className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-mute-text shadow-sm hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <Link href={`/product/${product.slug}`} className="text-sm font-medium hover:underline">
          {product.title}
        </Link>
        <p className="mt-0.5 text-xs capitalize text-mute-text">
          {product.category.replace("-", " ")}
        </p>
        <div className="mt-1 flex items-baseline gap-2 text-sm">
          <span className={cn(product.compareAtPrice && "text-destructive")}>
            {formatINR(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs text-mute-text line-through">
              {formatINR(product.compareAtPrice)}
            </span>
          )}
        </div>

        {/* Size picker — sold-out sizes are shown but disabled. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.sizes.map((s) => {
            const disabled = soldOut.includes(s);
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={cn(
                  "min-w-8 border px-2 py-1 text-xs",
                  disabled && "cursor-not-allowed text-mute-text line-through opacity-50",
                  size === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Colour picker — only when there's a choice to make. */}
        {product.colors.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-label={c.name}
                aria-pressed={color === c.name}
                title={c.name}
                className={cn(
                  "size-5 rounded-full border",
                  color === c.name ? "ring-2 ring-foreground ring-offset-1" : "border-border",
                )}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button
            size="sm"
            className="w-full"
            onClick={moveToBag}
            disabled={allSoldOut}
          >
            {allSoldOut ? "Sold out" : "Move to bag"}
          </Button>
        </div>
      </div>
    </div>
  );
}
