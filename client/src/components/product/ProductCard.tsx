import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { formatINR } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectWishlistIds, toggle_wishlist } from "@/redux/features/wishlist-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/image-shimmer";

export function ProductCard({ product }: { product: Product }) {
  const hydrated = useHydrated();
  const dispatch = useAppDispatch();
  const requireAuth = useRequireAuth();
  const inWishlist = useAppSelector(selectWishlistIds).includes(product.id);

  return (
    <div className="group">
      <Link
        href={`/product/${product.slug}`}
        className="block"
        aria-label={product.title}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-stone">
          <ImageShimmer
            src={product.images[0]}
            alt={product.title}
            wrapperClassName="h-full w-full transition duration-700 group-hover:scale-[1.02]"
          />
          {product.images[1] && (
            <img
              src={product.images[1]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100"
              loading="lazy"
            />
          )}
          {product.isNew && (
            <span className="absolute left-3 top-3 bg-background/90 px-2 py-1 text-[10px] uppercase tracking-widest">
              New
            </span>
          )}
          {product.onSale && (
            <span className="absolute left-3 top-3 bg-ink px-2 py-1 text-[10px] uppercase tracking-widest text-primary-foreground">
              Sale
            </span>
          )}
        </div>
      </Link>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/product/${product.slug}`}
            className="block text-sm font-medium hover:underline"
          >
            {product.title}
          </Link>
          <p className="mt-0.5 text-xs text-mute-text capitalize">
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
        </div>
        <button
          type="button"
          aria-label={
            hydrated && inWishlist ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`
          }
          onClick={() =>
            requireAuth(() => {
              dispatch(toggle_wishlist(product.id));
              toast.success(inWishlist ? "Removed from wishlist" : "Added to wishlist");
            })
          }
          className="text-mute-text hover:text-foreground"
        >
          <Heart
            className={cn(
              "size-4 transition-colors",
              hydrated && inWishlist ? "text-red-500" : "text-foreground",
            )}
            // Inline fill wins over lucide's fill="none" attribute AND any
            // stylesheet, and needs no Tailwind utility to be generated — so the
            // heart is always solid (colour follows currentColor from text-*).
            style={{ fill: "currentColor" }}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
