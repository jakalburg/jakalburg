"use client";

import { usePathname } from "next/navigation";
import { OrdersTab } from "@/components/logistics/orders-tab";
import { DeliveryTab } from "@/components/logistics/delivery-tab";
import { AlertsTab } from "@/components/logistics/alerts-tab";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function LogisticsContent() {
  const pathname = usePathname();

  // Determine which content to show based on the pathname
  const isOrdersPage =
    pathname === "/logistics" || pathname.includes("/orders");
  const isDeliveryPage = pathname.includes("/delivery");
  const isAlertsPage = pathname.includes("/alerts");

  // Default to orders if on base /logistics path
  const showOrders = isOrdersPage && !isDeliveryPage && !isAlertsPage;
  const showDelivery = isDeliveryPage;
  const showAlerts = isAlertsPage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Logistics Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor orders, track shipments, and stay updated with system alerts
        </p>
      </div>

      {/* Content based on route */}
      <div className="mt-6">
        {showOrders && <OrdersTab />}
        {showDelivery && <DeliveryTab />}
        {showAlerts && <AlertsTab />}
      </div>
    </div>
  );
}

export default function LogisticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LogisticsContent />
    </Suspense>
  );
}
