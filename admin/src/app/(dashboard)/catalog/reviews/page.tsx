"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ReviewsTab } from "@/components/catalog/reviews-tab";

function ReviewsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
        <p className="text-muted-foreground mt-1">
          Moderate and manage customer feedback
        </p>
      </div>

      <ReviewsTab />
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ReviewsContent />
    </Suspense>
  );
}
