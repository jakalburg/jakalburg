"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ReviewsTab } from "@/components/catalog/reviews-tab";
import { AddReviewFab } from "@/components/catalog/add-review-fab";
import { ManageReviewsButton } from "@/components/catalog/manage-reviews-dialog";

function ReviewsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Reviews</h1>
          <p className="text-muted-foreground mt-1">
            Moderate customer feedback, or add a review of your own
          </p>
        </div>
        {/* Bulk manager: show/hide reviews and add reviews across many products. */}
        <ManageReviewsButton />
      </div>

      <ReviewsTab />

      {/* Picks a product first, then opens the same dialog the product table
          row menu uses. */}
      <AddReviewFab />
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
