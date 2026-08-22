"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PaymentsTab } from "@/components/settings/PaymentsTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function PaymentsContent() {
  return (
    <SettingsPageShell
      title="Payment Settings"
      description="Configure payment methods and gateways."
    >
      <PaymentsTab />
    </SettingsPageShell>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
