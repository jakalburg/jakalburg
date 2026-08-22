"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OrdersTab } from "@/components/logistics/orders-tab";

function OrdersContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage all customer orders
        </p>
      </div>

      <OrdersTab />
    </div>
  );
}

export default function LogisticsOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
