"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DeliveryTab } from "@/components/logistics/delivery-tab";

function DeliveryContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Delivery</h1>
        <p className="text-muted-foreground mt-1">
          Track shipments and manage deliveries
        </p>
      </div>

      <DeliveryTab />
    </div>
  );
}

export default function LogisticsDeliveryPage() {
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
