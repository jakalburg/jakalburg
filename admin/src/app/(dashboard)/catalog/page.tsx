"use client";

import { usePathname } from "next/navigation";
import { ProductsTab } from "@/components/catalog/products-tab";
import { CategoriesTab } from "@/components/catalog/categories-tab";
import { CouponsTab } from "@/components/catalog/coupons-tab";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function CatalogContent() {
  const pathname = usePathname();

  // Determine which content to show based on the pathname
  const isProductsPage =
    pathname === "/catalog" || pathname.includes("/products");
  const isCategoriesPage = pathname.includes("/categories");
  const isCouponsPage = pathname.includes("/coupons");

  // Default to products if on base /catalog path
  const showProducts =
    isProductsPage && !isCategoriesPage && !isCouponsPage;
  const showCategories = isCategoriesPage;
  const showCoupons = isCouponsPage;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Catalog Management
        </h2>
      </div>

      {/* Content based on route */}
      <div className="space-y-4">
        {showProducts && <ProductsTab />}
        {showCategories && <CategoriesTab />}
        {showCoupons && <CouponsTab />}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
