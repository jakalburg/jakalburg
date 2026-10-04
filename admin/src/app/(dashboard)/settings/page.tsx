"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Store,
  Bell,
  CreditCard,
  Truck,
  HardDrive,
  Mail,
  Loader2,
  Timer,
} from "lucide-react";

import { StoreTab } from "@/components/settings/StoreTab";
import { PaymentsTab } from "@/components/settings/PaymentsTab";
import { DeliveryTab } from "@/components/settings/DeliveryTab";
import { StorageTab } from "@/components/settings/StorageTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { EmailTab } from "@/components/settings/EmailTab";
import { OrdersTab } from "@/components/settings/OrdersTab";
import { MaintenanceTab } from "@/components/settings/MaintenanceTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const validTabs = [
    "store",
    "orders",
    "payments",
    "delivery",
    "media",
    "notifications",
    "email",
    "maintenance",
  ];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(tabFromUrl || "") ? tabFromUrl! : "store",
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <SettingsPageShell
      title="Settings"
      description="Manage your account settings and set e-mail preferences."
    >
      <Tabs
        defaultValue="store"
        value={activeTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1 lg:w-[950px]">
          <TabsTrigger value="store">
            <Store className="w-4 h-4 mr-2" />
            Store
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Truck className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-4 h-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="delivery">
            <Truck className="w-4 h-4 mr-2" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="media">
            <HardDrive className="w-4 h-4 mr-2" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Timer className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="store" className="space-y-4">
            <StoreTab />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentsTab />
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4">
            <DeliveryTab />
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <StorageTab />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <EmailTab />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersTab />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <MaintenanceTab />
          </TabsContent>
        </div>
      </Tabs>
    </SettingsPageShell>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
