"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CouponsTab } from "@/components/catalog/coupons-tab";

function CouponsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage discount coupons
        </p>
      </div>

      <CouponsTab />
    </div>
  );
}

export default function CouponsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CouponsContent />
    </Suspense>
  );
}
