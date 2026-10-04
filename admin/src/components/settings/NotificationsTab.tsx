"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
  type NotificationSettingsUpdate,
} from "@/hooks/use-notifications";

type Prefs = Required<NotificationSettingsUpdate>;

const FALLBACK: Prefs = {
  emailOrderPlaced: true,
  emailOrderShipped: true,
  emailOrderCancelled: true,
  inAppOrderPlaced: true,
  inAppOrderShipped: true,
  inAppOrderCancelled: true,
};

/**
 * Copy is deliberately specific about WHO receives each email, because the
 * three are not the same: the first goes to the store owner, the other two go
 * to the customer. Describing all three as "receive an email" (as the mock
 * version did) reads as if the owner gets mailed when they themselves mark an
 * order shipped, which is not what any of them do.
 */
const EMAIL_ROWS: { key: keyof Prefs; label: string; help: string }[] = [
  {
    key: "emailOrderPlaced",
    label: "New orders",
    help: "Email you when a customer places an order. Goes to the owner address in Settings → Email.",
  },
  {
    key: "emailOrderShipped",
    label: "Order shipped",
    help: "Email the customer when their order is marked as shipped.",
  },
  {
    key: "emailOrderCancelled",
    label: "Order cancelled",
    help: "Email the customer when their order is cancelled.",
  },
];

const IN_APP_ROWS: { key: keyof Prefs; label: string; help: string }[] = [
  {
    key: "inAppOrderPlaced",
    label: "New orders",
    help: "Show a bell alert when a customer places an order.",
  },
  {
    key: "inAppOrderShipped",
    label: "Order shipped",
    help: "Show a bell alert when an order is marked as shipped.",
  },
  {
    key: "inAppOrderCancelled",
    label: "Order cancelled",
    help: "Show a bell alert when an order is cancelled.",
  },
];

export function NotificationsTab() {
  const { data: serverSettings, isLoading, isError } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const [prefs, setPrefs] = useState<Prefs>(FALLBACK);

  useEffect(() => {
    if (!serverSettings) return;
    const { id: _id, ...rest } = serverSettings;
    setPrefs(rest);
  }, [serverSettings]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  const handleToggle = useCallback(
    (field: keyof Prefs, value: boolean) => {
      const next = { ...prefs, [field]: value };
      setPrefs(next);
      // Debounced so flipping several switches in a row is one request.
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateSettings.mutate(next);
      }, 500);
    },
    [prefs, updateSettings],
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-1/3" />
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

  const rows = (list: typeof EMAIL_ROWS) =>
    list.map((row, i) => (
      <div key={row.key}>
        {i > 0 && <Separator className="my-4" />}
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-0.5">
            <div className="text-base font-medium">{row.label}</div>
            <p className="text-sm text-muted-foreground">{row.help}</p>
          </div>
          <Switch
            checked={prefs[row.key]}
            disabled={isError}
            onCheckedChange={(checked) => handleToggle(row.key, checked)}
          />
        </div>
      </div>
    ));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what you and your customers are told about. Changes auto-save.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Couldn&apos;t load notification settings. Until this loads, the
              server falls back to sending every notification.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
          {rows(EMAIL_ROWS)}
          <p className="mt-4 text-xs text-muted-foreground">
            Order confirmations to customers are always sent — they&apos;re the
            receipt for a purchase, not a notification. The &ldquo;Notify
            customer&rdquo; checkbox on an order still applies on top of the two
            switches above: both must be on for that email to go out.
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="mb-4 text-lg font-medium">In-App Alerts</h3>
          {rows(IN_APP_ROWS)}
          <p className="mt-4 text-xs text-muted-foreground">
            Alerts appear in the bell in the header. Read alerts are cleared
            automatically after 30 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
