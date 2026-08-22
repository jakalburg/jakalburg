"use client";

import { Suspense, use, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/products/product-form";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAdminQuery } from "@/hooks/use-admin-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { productsService } from "@/services";
import Loader from "@/components/ui/loader";
import { useSession } from "@/lib/mock-auth";

function EditProductPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const api = useAxiosAuth();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  // Preserve the products list filters (category, search, page, ...) so
  // cancelling or saving returns to the same filtered view.
  const returnQuery = searchParams.toString();
  const backHref = returnQuery ? `/products?${returnQuery}` : "/products";

  // Fetch product by ID
  const { data: product, isPending } = useAdminQuery(["product", id], () =>
    productsService(api).getById(id),
  );

  // Log brand name when product data is available
  useEffect(() => {
    if (product) {
      console.log("Product brand:", product.brand);
      console.log("Product brandId:", product.brandId);
    }
  }, [product]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 ">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1">
            Update product information
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm mode="edit" product={product} backHref={backHref} />
    </div>
  );
}

export default function EditProductPage({
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
      <EditProductPageContent params={params} />
    </Suspense>
  );
}
