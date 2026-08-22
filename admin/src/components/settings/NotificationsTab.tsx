"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/lib/mock-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/hooks/use-notifications";
import { Skeleton } from "@/components/ui/skeleton";

export function NotificationsTab() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id;

  const { data: serverSettings, isLoading } = useNotificationSettings(userId);
  const updateSettingsMutation = useUpdateNotificationSettings();

  const [notificationSettings, setNotificationSettings] = useState({
    emailOrderPlaced: true,
    emailOrderShipped: true,
    emailOrderCancelled: true,
    inAppOrderPlaced: true,
    inAppOrderShipped: true,
    inAppOrderCancelled: true,
  });

  useEffect(() => {
    if (serverSettings) {
      setNotificationSettings({
        emailOrderPlaced: serverSettings.emailOrderPlaced,
        emailOrderShipped: serverSettings.emailOrderShipped,
        emailOrderCancelled: serverSettings.emailOrderCancelled,
        inAppOrderPlaced: serverSettings.inAppOrderPlaced,
        inAppOrderShipped: serverSettings.inAppOrderShipped,
        inAppOrderCancelled: serverSettings.inAppOrderCancelled,
      });
    }
  }, [serverSettings]);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const autoSaveNotifications = useCallback(
    (newSettings: typeof notificationSettings) => {
      if (!userId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateSettingsMutation.mutate({ userId, settings: newSettings });
      }, 500);
    },
    [userId, updateSettingsMutation],
  );

  const handleToggleChange = useCallback(
    (field: keyof typeof notificationSettings, value: boolean) => {
      const newSettings = { ...notificationSettings, [field]: value };
      setNotificationSettings(newSettings);
      autoSaveNotifications(newSettings);
    },
    [notificationSettings, autoSaveNotifications],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what events you want to be notified about. Changes auto-save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">New Orders</div>
                <p className="text-sm text-muted-foreground">
                  Receive an email when a customer places a new order.
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailOrderPlaced}
                onCheckedChange={(checked) =>
                  handleToggleChange("emailOrderPlaced", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Order Shipped</div>
                <p className="text-sm text-muted-foreground">
                  Receive an email when an order is marked as shipped.
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailOrderShipped}
                onCheckedChange={(checked) =>
                  handleToggleChange("emailOrderShipped", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Order Cancelled</div>
                <p className="text-sm text-muted-foreground">
                  Receive an email if an order is cancelled.
                </p>
              </div>
              <Switch
                checked={notificationSettings.emailOrderCancelled}
                onCheckedChange={(checked) =>
                  handleToggleChange("emailOrderCancelled", checked)
                }
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h3 className="text-lg font-medium mb-4">In-App Alerts</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">New Orders</div>
                <p className="text-sm text-muted-foreground">
                  Show a notification bell alert for new orders.
                </p>
              </div>
              <Switch
                checked={notificationSettings.inAppOrderPlaced}
                onCheckedChange={(checked) =>
                  handleToggleChange("inAppOrderPlaced", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Order Shipped</div>
                <p className="text-sm text-muted-foreground">
                  Show an alert when an order status changes to shipped.
                </p>
              </div>
              <Switch
                checked={notificationSettings.inAppOrderShipped}
                onCheckedChange={(checked) =>
                  handleToggleChange("inAppOrderShipped", checked)
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-base font-medium">Order Cancelled</div>
                <p className="text-sm text-muted-foreground">
                  Show an alert when an order is cancelled.
                </p>
              </div>
              <Switch
                checked={notificationSettings.inAppOrderCancelled}
                onCheckedChange={(checked) =>
                  handleToggleChange("inAppOrderCancelled", checked)
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
