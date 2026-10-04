"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  usePaymentSettings,
  useUpdatePaymentSettings,
} from "@/hooks/use-payment-settings";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Check, CreditCard, Pencil } from "lucide-react";
import { SettingsActions } from "./settings-layout";

/**
 * Settings → Payments: which methods checkout offers, and the Razorpay
 * credentials behind the online one.
 *
 * Whatever is switched on here is exactly what a customer sees at checkout —
 * there is no second list to keep in sync. Razorpay additionally needs both
 * keys before it counts as live; the server refuses to advertise it otherwise,
 * so a toggle can never send a shopper to a checkout that cannot open.
 */
export function PaymentsTab() {
  const { data: settings, isLoading } = usePaymentSettings();
  const updateMutation = useUpdatePaymentSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  // Always starts blank: the server never returns the stored secret, and a
  // blank value means "keep it".
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");

  const resetFromServer = useCallback(() => {
    if (!settings) return;
    setCodEnabled(settings.codEnabled);
    setRazorpayEnabled(settings.razorpayEnabled);
    setRazorpayKeyId(settings.razorpayKeyId || "");
    setRazorpayKeySecret("");
  }, [settings]);

  useEffect(resetFromServer, [resetFromServer]);

  const handleCancel = () => {
    setIsEditing(false);
    resetFromServer();
  };

  // Will Razorpay actually be usable once saved? Mirrors the server's rule.
  const secretWillBeSet = Boolean(razorpayKeySecret) || Boolean(settings?.isRazorpaySecretSet);
  const razorpayLive = razorpayEnabled && Boolean(razorpayKeyId) && secretWillBeSet;

  const handleSave = () => {
    if (razorpayEnabled && (!razorpayKeyId || !secretWillBeSet)) {
      toast.error("Razorpay needs both a Key ID and a Key Secret to go live.");
      return;
    }
    if (!codEnabled && !razorpayEnabled) {
      toast.error("Enable at least one payment method, or customers can't check out.");
      return;
    }

    updateMutation.mutate(
      {
        codEnabled,
        razorpayEnabled,
        razorpayKeyId,
        // Only send a secret the admin actually typed.
        ...(razorpayKeySecret ? { razorpayKeySecret } : {}),
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setRazorpayKeySecret("");
        },
      },
    );
  };

  const disabled = !isEditing;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            How customers can pay. Whatever is on here is what checkout offers.
          </CardDescription>
        </div>
        <SettingsActions>
          {!isEditing ? (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="w-full md:w-auto"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full md:w-auto"
              >
                {updateMutation.isPending ? "Saving…" : "Save Configuration"}
              </Button>
            </>
          )}
        </SettingsActions>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {!codEnabled && !razorpayEnabled && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No payment method is enabled — customers cannot complete an
                  order.
                </AlertDescription>
              </Alert>
            )}

            {/* Cash on Delivery */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                      <Banknote className="h-4 w-4" />
                    </span>
                    <Label className="text-base">Cash on Delivery</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The customer pays the full amount when the order arrives.
                  </p>
                </div>
                <Switch
                  checked={codEnabled}
                  onCheckedChange={setCodEnabled}
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Razorpay */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-4 p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <Label className="text-base">Pay Online (Razorpay)</Label>
                    {razorpayLive ? (
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <Check className="h-3 w-3" /> Live
                      </span>
                    ) : razorpayEnabled ? (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        Keys needed
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    UPI, cards and netbanking, collected upfront through
                    Razorpay.
                  </p>
                </div>
                <Switch
                  checked={razorpayEnabled}
                  onCheckedChange={setRazorpayEnabled}
                  disabled={disabled}
                />
              </div>

              {(razorpayEnabled || isEditing) && (
                <div className="p-4 space-y-4 border-t">
                  <div className="space-y-2">
                    <Label>Key ID</Label>
                    <Input
                      placeholder="rzp_test_..."
                      value={razorpayKeyId}
                      onChange={(e) => setRazorpayKeyId(e.target.value)}
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      The publishable half — it's sent to the customer's browser
                      to open the payment window.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Key Secret</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        settings?.isRazorpaySecretSet
                          ? "•••••••••• (stored, encrypted)"
                          : "Enter the key secret"
                      }
                      value={razorpayKeySecret}
                      onChange={(e) => setRazorpayKeySecret(e.target.value)}
                      disabled={disabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Stored encrypted and never shown again. Leave blank to
                      keep the current one.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
