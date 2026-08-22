"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/products/product-form";

function CreateProductPageContent() {
  const searchParams = useSearchParams();
  // Preserve the products list filters so cancelling or saving returns to
  // the same filtered view the user came from.
  const returnQuery = searchParams.toString();
  const backHref = returnQuery ? `/products?${returnQuery}` : "/products";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Product</h1>
          <p className="text-muted-foreground mt-1">
            Add a new product to your inventory
          </p>
        </div>
      </div>

      {/* Form */}
      <ProductForm mode="create" backHref={backHref} />
    </div>
  );
}

export default function CreateProductPage() {
  return (
    <Suspense fallback={null}>
      <CreateProductPageContent />
    </Suspense>
  );
}
