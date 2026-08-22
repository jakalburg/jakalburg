"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { HeaderTab } from "@/components/website/header-tab";

function HeaderContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Header Menu</h1>
        <p className="text-muted-foreground mt-1">
          Manage your store's header navigation and menu structure
        </p>
      </div>

      <HeaderTab />
    </div>
  );
}

export default function WebsiteHeaderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
