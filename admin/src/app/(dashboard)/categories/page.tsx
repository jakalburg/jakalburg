"use client";

import { CategoriesTab } from "@/components/catalog/categories-tab";

/**
 * Catalog → Categories.
 *
 * The table itself lives in CategoriesTab so this route and /catalog/categories
 * render exactly the same screen — they used to be two near-identical copies
 * that could drift apart.
 */
export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="mt-1 text-muted-foreground">
          The categories products can be filed under, and how they appear on the
          storefront.
        </p>
      </div>
      <CategoriesTab />
    </div>
  );
}
