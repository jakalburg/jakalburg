"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StoreTab } from "@/components/settings/StoreTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function StoreContent() {
  return (
    <SettingsPageShell
      title="Store Settings"
      description="Configure your store details and branding."
    >
      <StoreTab />
    </SettingsPageShell>
  );
}

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <StoreContent />
    </Suspense>
  );
}
