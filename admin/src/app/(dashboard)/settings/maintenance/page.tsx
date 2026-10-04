"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MaintenanceTab } from "@/components/settings/MaintenanceTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function MaintenanceContent() {
  return (
    <SettingsPageShell
      title="Maintenance Mode"
      description="Close the storefront to customers while you work on it."
    >
      <MaintenanceTab />
    </SettingsPageShell>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}
