"use client";

import { Suspense, use, useState } from "react";
import {
  ChevronLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  BadgePercent,
  Layers,
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
import { productsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import Loader from "@/components/ui/loader";
import { useSession } from "@/lib/mock-auth";

const statusColors = {
  draft: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  published: "bg-green-500/10 text-green-500 border-green-500/20",
  archived: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

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

  // State for selected image
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedColorImage, setSelectedColorImage] = useState<string | null>(null);

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

  // Use media array from backend
  const media = product.media || [];
  const images = media.filter((m: any) => m.mediaType === "image");
  const displayedImage = images[selectedImageIndex] || images[0];

  const hasDiscount =
    product.listPrice && product.price && product.listPrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.listPrice - product.price) / product.listPrice) * 100,
      )
    : product.discount || product.discountPercentage || 0;
  const categoryName =
    typeof product.category === "string"
      ? product.category
      : product.category?.name || "N/A";
  const brandName =
    typeof product.brand === "string"
      ? product.brand
      : product.brand?.name || product.brandName || null;
  const tags = product.tags || [];
  const relatedProducts = product.relatedProducts || [];

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
              {product.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Product details and information
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* Images */}
        <Card className="">
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent>
            {displayedImage ? (
              <div className="space-y-4">
                <ImageShimmer
                  src={selectedColorImage || displayedImage.publicUrl}
                  alt={product.name}
                  wrapperClassName="aspect-square w-full rounded-lg"
                />
                {images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((image: any, index: number) => (
                      <div
                        key={image.id}
                        onClick={() => { setSelectedImageIndex(index); setSelectedColorImage(null); }}
                        className={cn(
                          "rounded-md overflow-hidden border-2 cursor-pointer transition-all hover:border-primary/50",
                          index === selectedImageIndex && !selectedColorImage
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border",
                        )}
                      >
                        <ImageShimmer
                          src={image.publicUrl}
                          alt={product.name}
                          wrapperClassName="aspect-square w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* Color swatches for Steal Deal products */}
                {product.isStealDeal && product.colorImages && product.colorImages.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Product Colors</p>
                    {(() => {
                      const colorData = product.colorImages;
                      const isGrouped = colorData[0]?.productName && colorData[0]?.colors;
                      const groups = isGrouped
                        ? colorData.filter((g: any) => g.colors?.length > 0)
                        : [{ productName: "Colors", colors: colorData }];
                      return groups.map((group: any) => (
                        <div key={group.productName} className="space-y-1.5">
                          <span className="text-xs font-medium text-foreground">
                            {group.productName}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {group.colors.map((c: any, idx: number) => (
                              <button
                                key={`${c.color}-${idx}`}
                                type="button"
                                onClick={() => setSelectedColorImage(c.imageUrl)}
                                title={c.color}
                                className={cn(
                                  "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                                  selectedColorImage === c.imageUrl
                                    ? "border-primary ring-2 ring-primary/20 scale-110"
                                    : "border-border"
                                )}
                                style={{ backgroundColor: c.hexCode || "#ccc" }}
                              />
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
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
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm">{product.description}</p>
              </div>
              {product.sku && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">SKU</p>
                  <p className="text-sm font-mono">{product.sku}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <Badge variant="outline">{categoryName}</Badge>
              </div>
              {brandName && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Brand</p>
                  <Badge variant="outline" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {brandName}
                  </Badge>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {product.status && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusColors[
                        product.status as keyof typeof statusColors
                      ] || "",
                    )}
                  >
                    {product.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="">
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {/* Original / List Price */}
                  {product.listPrice != null && (
                    <TableRow>
                      <TableCell className="font-medium">
                        Original Price
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground line-through">
                        ₹{Number(product.listPrice).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )}
                  {/* Selling Price */}
                  <TableRow>
                    <TableCell className="font-medium">Selling Price</TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      ₹
                      {Number(
                        product.price ?? product.originalPrice ?? 0,
                      ).toFixed(2)}
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
                          (product.stockQuantity ?? product.quantity ?? 0) ===
                            0 && "text-red-500",
                          (product.stockQuantity ?? product.quantity ?? 0) >
                            0 &&
                            (product.stockQuantity ?? product.quantity ?? 0) <
                              10 &&
                            "text-orange-500",
                          (product.stockQuantity ?? product.quantity ?? 0) >=
                            10 && "text-green-600",
                        )}
                      >
                        {product.stockQuantity ?? product.quantity ?? 0}
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
                          product.inStock
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                      >
                        {product.inStock ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {/* Currency */}
                  {product.currency && (
                    <TableRow>
                      <TableCell className="font-medium">Currency</TableCell>
                      <TableCell className="text-right">
                        {product.currency}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Product Options */}
      {relatedProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Product Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedProducts.map((rp: any) => {
                const rpImage = rp.img || rp.thumbnail || null;
                return (
                  <Link
                    key={rp.id}
                    href={`/products/${rp.id}`}
                    className="group"
                  >
                    <div className="rounded-lg border overflow-hidden hover:border-primary transition-colors">
                      <div className="aspect-square bg-muted relative">
                        {rpImage ? (
                          <ImageShimmer
                            src={rpImage}
                            alt={rp.name}
                            wrapperClassName="absolute inset-0"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {rp.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₹{Number(rp.price ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      {product.additionalInfo && product.additionalInfo.length > 0 && (
        <Card className="">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {product.additionalInfo.map((info: any) => (
                  <TableRow key={info.id}>
                    <TableCell className="font-medium">{info.key}</TableCell>
                    <TableCell>{info.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* SEO */}
      {product.seo &&
        (product.seo.metaTitle || product.seo.metaDescription) && (
          <Card className="">
            <CardHeader>
              <CardTitle>SEO Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.seo.metaTitle && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Meta Title
                  </p>
                  <p className="text-sm">{product.seo.metaTitle}</p>
                </div>
              )}
              {product.seo.metaDescription && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Meta Description
                  </p>
                  <p className="text-sm">{product.seo.metaDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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
