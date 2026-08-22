"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PagesTab } from "@/components/website/pages-tab";

function PagesContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Static Pages</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage static pages like About, Terms, Privacy Policy
        </p>
      </div>

      <PagesTab />
    </div>
  );
}

export default function WebsitePagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PagesContent />
    </Suspense>
  );
}
