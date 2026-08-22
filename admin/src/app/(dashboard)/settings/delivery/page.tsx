"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DeliveryTab } from "@/components/settings/DeliveryTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function DeliveryContent() {
  return (
    <SettingsPageShell
      title="Delivery Settings"
      description="Configure shipping and delivery preferences."
    >
      <DeliveryTab />
    </SettingsPageShell>
  );
}

export default function DeliveryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <DeliveryContent />
    </Suspense>
  );
}
