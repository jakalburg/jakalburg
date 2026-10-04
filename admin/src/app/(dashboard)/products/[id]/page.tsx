"use client";

import { Suspense, use, useState } from "react";
import {
  ChevronLeft,
  Edit,
  Trash2,
  BadgePercent,
  Palette,
  Star,
  Images,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { productsService, type ProductColorInput } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import Loader from "@/components/ui/loader";
import { useSession } from "@/lib/mock-auth";

// ---------------------------------------------------------------------------
// Read-only view of the LEAN product the server actually stores (see
// server/prisma/models/Product.prisma): every column of Product plus the full
// ProductColor[] set. Each colour is a variant in its own right — it may carry
// its own images, sizes, sold-out set, price, compare-at and stock — and an
// empty array / null there means "inherit the product-level value". That
// inheritance is spelled out per field below rather than rendered as a blank,
// because "no override" and "no value" look identical otherwise.
// ---------------------------------------------------------------------------

const money = (value: number) => `₹${Number(value).toFixed(2)}`;

const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toUrlList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((x: unknown): x is string => typeof x === "string")
    : [];

/**
 * Does this colour's gallery hold exactly the product-level photos, in order?
 * That's the signature of the "base colour" the product form writes for the
 * main photos — worth labelling so it doesn't read as a duplicate variant.
 * Mirrors `isBaseColor` in product-form.tsx.
 */
const isBaseGallery = (colorImages: string[], productImages: string[]) =>
  productImages.length > 0 &&
  colorImages.length === productImages.length &&
  colorImages.every((url, i) => url === productImages[i]);

/** Label + value block, the layout the rest of the detail cards already use. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Size chips with the sold-out subset struck through. */
function SizeChips({
  sizes,
  soldOutSizes,
}: {
  sizes: string[];
  soldOutSizes: string[];
}) {
  if (sizes.length === 0) {
    return <span className="text-sm text-muted-foreground">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {sizes.map((size) => {
        const soldOut = soldOutSizes.includes(size);
        return (
          <Badge
            key={size}
            variant="outline"
            title={soldOut ? "Sold out" : "In stock"}
            className={cn(
              "font-mono",
              soldOut &&
                "line-through text-red-500 border-red-500/20 bg-red-500/5",
            )}
          >
            {size}
          </Badge>
        );
      })}
    </div>
  );
}

function ViewProductPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const api = useAxiosAuth();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  // Preserve the products list filters so navigating back (or editing then
  // returning) keeps the same filtered view the user came from.
  const returnQuery = searchParams.toString();
  const backHref = returnQuery ? `/products?${returnQuery}` : "/products";
  const editHref = returnQuery
    ? `/products/${id}/edit?${returnQuery}`
    : `/products/${id}/edit`;

  // Fetch product by ID
  const { data: product, isPending } = useAdminQuery(["product", id], () =>
    productsService(api).getById(id),
  );

  // Which gallery the big preview is showing: null = the product photos,
  // otherwise the index of a colour. A colour with no images of its own falls
  // back to the product photos, same as the storefront does.
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const showColor = (index: number | null) => {
    setActiveColor(index);
    setActiveIndex(0);
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await productsService(api).delete(id);
        toast.success("Product deleted successfully");
        router.push(backHref);
      } catch {
        toast.error("Failed to delete product");
      }
    }
  };

  if (sessionStatus !== "authenticated" || isPending) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Product not found</h2>
          <p className="text-muted-foreground mb-4">
            The product you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href={backHref}>Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const productImages = toUrlList(product.images);
  const colors: ProductColorInput[] = Array.isArray(product.colors)
    ? product.colors
    : [];
  const sizes = toUrlList(product.sizes);
  const soldOutSizes = toUrlList(product.soldOutSizes);
  const tags = toUrlList(product.tags);
  // Prefer the array; fall back to the deprecated single slug so legacy rows
  // still show their membership.
  const collections = toUrlList(product.collections).length
    ? toUrlList(product.collections)
    : product.collection
      ? [product.collection]
      : [];

  const activeColorImages =
    activeColor !== null ? toUrlList(colors[activeColor]?.images) : [];
  const gallery =
    activeColor !== null && activeColorImages.length
      ? activeColorImages
      : productImages;
  const displayedImage = gallery[activeIndex] ?? gallery[0];
  const galleryLabel =
    activeColor === null
      ? "All product photos"
      : activeColorImages.length
        ? `${colors[activeColor]?.name} photos`
        : `${colors[activeColor]?.name} — inherits the product photos`;

  const price = Number(product.price ?? 0);
  const compareAtPrice =
    typeof product.compareAtPrice === "number" ? product.compareAtPrice : null;
  const hasDiscount = compareAtPrice != null && compareAtPrice > price;
  const discountPct = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;
  const stock = Number(product.stock ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href={backHref}>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight break-words sm:text-3xl">
              {product.title ?? product.name}
            </h1>
            <p className="text-muted-foreground mt-1 font-mono text-xs break-all">
              /{product.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pl-12 sm:pl-0">
          <Button variant="outline" asChild>
            <Link href={editHref}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Storefront flags — every boolean the product carries, in one row. */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={
            product.isActive
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-orange-500/10 text-orange-500 border-orange-500/20"
          }
        >
          {product.isActive ? "Active" : "Hidden"}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {product.gender}
        </Badge>
        {product.isNew && (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20" variant="outline">
            New
          </Badge>
        )}
        {product.onSale && (
          <Badge className="bg-pink-500/10 text-pink-600 border-pink-500/20" variant="outline">
            On sale
          </Badge>
        )}
        {product.essential && (
          <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20" variant="outline">
            Essential
          </Badge>
        )}
        <Badge
          variant="outline"
          className={
            product.reviewsHidden
              ? "bg-muted text-muted-foreground"
              : "bg-green-500/10 text-green-600 border-green-500/20"
          }
        >
          {product.reviewsHidden ? "Reviews hidden" : "Reviews shown"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Images */}
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images className="h-5 w-5" />
              Product Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayedImage ? (
              <div className="space-y-4">
                <ImageShimmer
                  src={displayedImage}
                  alt={product.title ?? product.name}
                  wrapperClassName="aspect-square w-full rounded-lg"
                />
                <p className="text-xs text-muted-foreground">{galleryLabel}</p>
                {gallery.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {gallery.map((url: string, index: number) => (
                      <div
                        key={`${url}-${index}`}
                        onClick={() => setActiveIndex(index)}
                        className={cn(
                          "rounded-md overflow-hidden border-2 cursor-pointer transition-all hover:border-primary/50",
                          index === activeIndex
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                      >
                        <ImageShimmer
                          src={url}
                          alt={`${product.title ?? product.name} ${index + 1}`}
                          wrapperClassName="aspect-square w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {colors.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">
                      Preview a colour
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => showColor(null)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          activeColor === null
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        All photos
                      </button>
                      {colors.map((c, i) => (
                        <button
                          key={`${c.name}-${i}`}
                          type="button"
                          onClick={() => showColor(i)}
                          title={`${c.name} (${c.hex})`}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                            activeColor === i
                              ? "border-primary ring-2 ring-primary/20 scale-110"
                              : "border-border",
                          )}
                          style={{ backgroundColor: c.hex || "#ccc" }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">No images</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <div className="space-y-6">
          <Card className="">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Description">
                <p className="whitespace-pre-line">{product.description}</p>
              </Field>
              <Field label="Category">
                <Badge variant="outline">{product.category || "—"}</Badge>
              </Field>
              <Field label="Gender">
                <Badge variant="outline" className="capitalize">
                  {product.gender}
                </Badge>
              </Field>
              <Field label="Collections">
                {collections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {collections.map((slug) => (
                      <Badge key={slug} variant="secondary">
                        {slug}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Field>
              <Field label="Tags">
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </Field>
              <Field label="Fabric">
                <p className="whitespace-pre-line">{product.fabric || "—"}</p>
              </Field>
              <Field label="Care instructions">
                <p className="whitespace-pre-line">{product.care || "—"}</p>
              </Field>
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableBody>
                  {/* Compare-at / strike-through price */}
                  {compareAtPrice != null && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Compare-at Price
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground line-through">
                        {money(compareAtPrice)}
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Selling Price */}
                  <TableRow>
                    <TableCell className="font-medium">Selling Price</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {money(price)}
                    </TableCell>
                  </TableRow>
                  {/* Discount % */}
                  {discountPct > 0 && (
                    <TableRow>
                      <TableCell className="font-medium flex items-center gap-1">
                        <BadgePercent className="h-4 w-4 text-green-500" />
                        Discount
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className="bg-green-500/10 text-green-600 border-green-500/20"
                          variant="outline"
                        >
                          {discountPct}% off
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Stock Quantity */}
                  <TableRow>
                    <TableCell className="font-medium">
                      Stock Quantity
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-medium",
                          stock === 0 && "text-red-500",
                          stock > 0 && stock < 10 && "text-orange-500",
                          stock >= 10 && "text-green-600",
                        )}
                      >
                        {stock}
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* In Stock */}
                  <TableRow>
                    <TableCell className="font-medium">In Stock</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          stock > 0
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                      >
                        {stock > 0 ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {/* Currency */}
                  <TableRow>
                    <TableCell className="font-medium">Currency</TableCell>
                    <TableCell className="text-right">
                      {product.currency ?? "INR"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Field label="Sizes (sold-out struck through)">
                <SizeChips sizes={sizes} soldOutSizes={soldOutSizes} />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Colour variants — the product's only real variant axis. Each colour
          can override images / sizes / price / compare-at / stock; anything it
          leaves empty inherits the product-level value shown above. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colour Variants
            <Badge variant="secondary">{colors.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {colors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This product has no colour variants.
            </p>
          ) : (
            <div className="space-y-4">
              {colors.map((c, i) => {
                const colorImages = toUrlList(c.images);
                const inheritsImages = colorImages.length === 0;
                const base = isBaseGallery(colorImages, productImages);
                const shownImages = inheritsImages ? productImages : colorImages;
                const colorSizes = toUrlList(c.sizes);
                const colorSoldOut = toUrlList(c.soldOutSizes);
                const inheritsSizes = colorSizes.length === 0;

                return (
                  <div
                    key={`${c.name}-${i}`}
                    className={cn(
                      "rounded-lg border p-4 space-y-4 transition-colors",
                      activeColor === i && "border-primary",
                    )}
                  >
                    {/* Identity */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => showColor(i)}
                        title={`Preview ${c.name}`}
                        className={cn(
                          "w-9 h-9 rounded-full border-2 shrink-0 transition-all hover:scale-110",
                          activeColor === i
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                        style={{ backgroundColor: c.hex || "#ccc" }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {c.hex}
                        </p>
                      </div>
                      {base && (
                        <Badge variant="outline" title="This colour's gallery is the product's main photos">
                          Main photos
                        </Badge>
                      )}
                      {/* The server orders colours by `position` but doesn't
                          serialise it, so the index IS the display order. */}
                      <span
                        className="ml-auto text-xs text-muted-foreground"
                        title="Display order on the storefront"
                      >
                        #{i + 1}
                      </span>
                    </div>

                    {/* Images */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Images{" "}
                        {inheritsImages && (
                          <span className="text-xs">
                            — none of its own, inherits the product photos
                          </span>
                        )}
                      </p>
                      {shownImages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {shownImages.map((url, idx) => (
                            <div
                              key={`${url}-${idx}`}
                              onClick={() => {
                                showColor(i);
                                setActiveIndex(idx);
                              }}
                              className={cn(
                                "w-16 h-16 rounded-md overflow-hidden border cursor-pointer transition-colors hover:border-primary",
                                inheritsImages && "opacity-60",
                              )}
                            >
                              <ImageShimmer
                                src={url}
                                alt={`${c.name} ${idx + 1}`}
                                wrapperClassName="w-16 h-16"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No images
                        </span>
                      )}
                    </div>

                    {/* Sizes */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Sizes{" "}
                        {inheritsSizes && (
                          <span className="text-xs">
                            — none of its own, inherits the product sizes
                          </span>
                        )}
                      </p>
                      <SizeChips
                        sizes={inheritsSizes ? sizes : colorSizes}
                        soldOutSizes={
                          inheritsSizes ? soldOutSizes : colorSoldOut
                        }
                      />
                    </div>

                    {/* Numeric overrides */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Price">
                        {typeof c.price === "number" ? (
                          <span className="font-medium">{money(c.price)}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Inherits {money(price)}
                          </span>
                        )}
                      </Field>
                      <Field label="Compare-at price">
                        {typeof c.compareAtPrice === "number" ? (
                          <span className="font-medium line-through text-muted-foreground">
                            {money(c.compareAtPrice)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {compareAtPrice != null
                              ? `Inherits ${money(compareAtPrice)}`
                              : "Inherits none"}
                          </span>
                        )}
                      </Field>
                      <Field label="Stock">
                        {typeof c.stock === "number" ? (
                          <span
                            className={cn(
                              "font-medium",
                              c.stock === 0 && "text-red-500",
                              c.stock > 0 && c.stock < 10 && "text-orange-500",
                              c.stock >= 10 && "text-green-600",
                            )}
                          >
                            {c.stock}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Inherits {stock}
                          </span>
                        )}
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviews + record metadata */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Average Rating</TableCell>
                  <TableCell className="text-right">
                    {Number(product.avgRating ?? 0).toFixed(1)} / 5
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">
                    Approved Reviews
                  </TableCell>
                  <TableCell className="text-right">
                    {product.reviewCount ?? 0}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">On Storefront</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        product.reviewsHidden
                          ? "bg-muted text-muted-foreground"
                          : "bg-green-500/10 text-green-600 border-green-500/20"
                      }
                    >
                      {product.reviewsHidden ? "Hidden" : "Shown"}
                    </Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">ID</TableCell>
                  <TableCell className="text-right font-mono text-xs break-all">
                    {product.id}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Slug</TableCell>
                  <TableCell className="text-right font-mono text-xs break-all">
                    {product.slug}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Created</TableCell>
                  <TableCell className="text-right">
                    {formatDate(product.createdAt)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Last Updated</TableCell>
                  <TableCell className="text-right">
                    {formatDate(product.updatedAt)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ViewProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[50vh]">
          <Loader size="lg" />
        </div>
      }
    >
      <ViewProductPageContent params={params} />
    </Suspense>
  );
}
