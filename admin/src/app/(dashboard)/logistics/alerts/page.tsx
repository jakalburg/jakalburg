"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AlertsTab } from "@/components/logistics/alerts-tab";

function AlertsContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground mt-1">
          System alerts and notifications
        </p>
      </div>

      <AlertsTab />
    </div>
  );
}

export default function LogisticsAlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AlertsContent />
    </Suspense>
  );
}
