"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { HomeSetupTab } from "@/components/website/home-setup-tab";

function HomeContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Home Setup</h1>
        <p className="text-muted-foreground mt-1">
          Configure your store's homepage layout and featured content
        </p>
      </div>

      <HomeSetupTab />
    </div>
  );
}

export default function WebsiteHomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
