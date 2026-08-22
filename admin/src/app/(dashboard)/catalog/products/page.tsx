"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProductsTab } from "@/components/catalog/products-tab";

function ProductsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-1">
          Manage and organize your product catalog
        </p>
      </div>

      <ProductsTab />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
