"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/products/product-form";

function CreateStealDealPageContent() {
  const searchParams = useSearchParams();
  const returnQuery = searchParams.toString();
  const backHref = returnQuery ? `/steal-deals?${returnQuery}` : "/steal-deals";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Steal Deal</h1>
          <p className="text-muted-foreground mt-1">
            Create a combo product with original products and color images
          </p>
        </div>
      </div>

      <ProductForm mode="create" dealMode backHref={backHref} />
    </div>
  );
}

export default function CreateStealDealPage() {
  return (
    <Suspense fallback={null}>
      <CreateStealDealPageContent />
    </Suspense>
  );
}
