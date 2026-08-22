"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CategoriesTab } from "@/components/catalog/categories-tab";

function CategoriesContent() {
  return (
    <div className="space-y-6">
      <CategoriesTab />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
