"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Banknote, Check, IndianRupee, Pencil } from "lucide-react";
import { SettingsActions } from "./settings-layout";

export function PaymentsTab() {
  const { data: storeSettings, isLoading } = useSettings();
  const updateStoreMutation = useUpdateSettings();

  const [isEditing, setIsEditing] = useState(false);
  const [enablePartialCOD, setEnablePartialCOD] = useState(false);
  const [partialCODMode, setPartialCODMode] = useState<"fixed" | "percentage">(
    "fixed",
  );
  // Displayed/edited in rupees; converted to/from integer paise at the API
  // boundary (partialCODFixedAmountPaise) — money is never stored as Float.
  const [partialCODFixedAmount, setPartialCODFixedAmount] = useState("500");
  const [partialCODPercentage, setPartialCODPercentage] = useState("20");
  const [enableRazorpay, setEnableRazorpay] = useState(false);
  const [enableWhatsApp, setEnableWhatsApp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");

  useEffect(() => {
    if (storeSettings) {
      setEnablePartialCOD(
        storeSettings.enablePartialCOD ?? storeSettings.enableCOD ?? false,
      );
      setPartialCODMode(storeSettings.partialCODMode ?? "fixed");
      setPartialCODFixedAmount(
        String((storeSettings.partialCODFixedAmountPaise ?? 50000) / 100),
      );
      setPartialCODPercentage(String(storeSettings.partialCODPercentage ?? 20));
      setEnableRazorpay(storeSettings.enableRazorpay ?? false);
      setEnableWhatsApp(storeSettings.enableWhatsApp ?? false);
      setWhatsappNumber(storeSettings.whatsappNumber || "");
      setRazorpayKeyId(storeSettings.razorpayKeyId || "");
      setRazorpayKeySecret("");
    }
  }, [storeSettings]);

  const handleCancel = () => {
    setIsEditing(false);
    if (storeSettings) {
      setEnablePartialCOD(
        storeSettings.enablePartialCOD ?? storeSettings.enableCOD ?? false,
      );
      setPartialCODMode(storeSettings.partialCODMode ?? "fixed");
      setPartialCODFixedAmount(
        String((storeSettings.partialCODFixedAmountPaise ?? 50000) / 100),
      );
      setPartialCODPercentage(String(storeSettings.partialCODPercentage ?? 20));
      setEnableRazorpay(storeSettings.enableRazorpay ?? false);
      setEnableWhatsApp(storeSettings.enableWhatsApp ?? false);
      setWhatsappNumber(storeSettings.whatsappNumber || "");
      setRazorpayKeyId(storeSettings.razorpayKeyId || "");
      setRazorpayKeySecret("");
    }
  };

  const handleSavePayments = () => {
    const fixedAmountRupees = Number(partialCODFixedAmount);
    const percentage = Math.round(Number(partialCODPercentage));

    if (partialCODMode === "fixed") {
      if (!Number.isFinite(fixedAmountRupees) || fixedAmountRupees <= 0) {
        toast.error("Partial COD fixed amount must be greater than ₹0.");
        return;
      }
    } else {
      if (!Number.isInteger(percentage) || percentage < 1 || percentage > 99) {
        toast.error("Partial COD percentage must be a whole number between 1% and 99%.");
        return;
      }
    }

    updateStoreMutation.mutate(
      {
        enableCOD: false,
        enablePartialCOD,
        partialCODMode,
        // Money is stored as integer paise on the backend, never Float.
        partialCODFixedAmountPaise: Math.round(fixedAmountRupees * 100),
        partialCODPercentage: percentage,
        enableRazorpay,
        enableWhatsApp,
        whatsappNumber,
        razorpayKeyId,
        ...(razorpayKeySecret ? { razorpayKeySecret } : {}),
      },
      {
        onSuccess: () => {
          setIsEditing(false);
          setRazorpayKeySecret("");
          toast.success("Payment methods updated.");
        },
        onError: () => toast.error("Failed to update payment methods."),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure how your customers can pay for their orders.
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
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePayments}
                disabled={updateStoreMutation.isPending}
                className="w-full md:w-auto"
              >
                Save Configuration
              </Button>
            </>
          )}
        </SettingsActions>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                  <Banknote className="h-4 w-4" />
                </span>
                <Label className="text-base">Partial Cash on Delivery</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Customers pay a required amount online through Razorpay and pay
                the remaining balance on delivery.
              </p>
            </div>
            <Switch
              checked={enablePartialCOD}
              onCheckedChange={setEnablePartialCOD}
              disabled={!isEditing}
            />
          </div>

          {(enablePartialCOD || isEditing) && (
            <div className="grid gap-4 border-t p-4 md:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label>Payment calculation</Label>
                <Select
                  value={partialCODMode}
                  onValueChange={(value) =>
                    setPartialCODMode(value as "fixed" | "percentage")
                  }
                  disabled={!isEditing}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {partialCODMode === "fixed"
                    ? "Online payment amount"
                    : "Online payment percentage"}
                </Label>
                <div className="relative">
                  {partialCODMode === "fixed" ? (
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      %
                    </span>
                  )}
                  <Input
                    type="number"
                    min={1}
                    max={partialCODMode === "percentage" ? 99 : undefined}
                    step={partialCODMode === "fixed" ? 1 : 1}
                    value={
                      partialCODMode === "fixed"
                        ? partialCODFixedAmount
                        : partialCODPercentage
                    }
                    onChange={(event) =>
                      partialCODMode === "fixed"
                        ? setPartialCODFixedAmount(event.target.value)
                        : setPartialCODPercentage(event.target.value)
                    }
                    disabled={!isEditing}
                    className={partialCODMode === "fixed" ? "pl-9" : "pr-9"}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Default is ₹500. If a fixed amount is equal to or greater than
                  the order total, checkout will ask the customer to use full
                  online payment.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-base">Razorpay Verification</Label>
                {storeSettings?.isRazorpayKeySecretSet && !enableRazorpay && (
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    Keys Set
                  </div>
                )}
                {storeSettings?.isRazorpayKeySecretSet && enableRazorpay && (
                  <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    <Check className="h-3 w-3" /> Live
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Accept online payments via UPI, Cards, Netbanking using
                Razorpay.
              </p>
            </div>
            <Switch
              checked={enableRazorpay}
              onCheckedChange={setEnableRazorpay}
              disabled={!isEditing}
            />
          </div>

          <div
            className={`p-4 space-y-4 border-t transition-all ${
              enableRazorpay || isEditing ? "block" : "hidden"
            }`}
          >
            <div className="space-y-2">
              <Label>Key ID</Label>
              <Input
                placeholder="rzp_test_..."
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Key Secret</Label>
              <Input
                type="password"
                placeholder={
                  storeSettings?.isRazorpayKeySecretSet
                    ? "•••••••••• (Stored safely)"
                    : "Enter new secret"
                }
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                disabled={!isEditing}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current secret.
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-base">WhatsApp Orders</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to place orders directly via WhatsApp message.
              </p>
            </div>
            <Switch
              checked={enableWhatsApp}
              onCheckedChange={setEnableWhatsApp}
              disabled={!isEditing}
            />
          </div>

          {enableWhatsApp && (
            <div className="p-4 border-t space-y-4">
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  placeholder="+91..."
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +919876543210)
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
