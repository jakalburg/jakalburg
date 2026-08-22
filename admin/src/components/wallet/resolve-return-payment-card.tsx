"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Banknote, CheckCircle2, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useReturnResolution,
  useResolveWithWalletCredit,
  useResolveWithRefundRecord,
} from "@/hooks/use-wallet";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { uploadService } from "@/services/upload.service";

const MIN_REASON_LENGTH = 10;

interface ResolveReturnPaymentCardProps {
  orderId: string;
}

export function ResolveReturnPaymentCard({ orderId }: ResolveReturnPaymentCardProps) {
  const { data, isLoading } = useReturnResolution(orderId);
  const [mode, setMode] = useState<"choice" | "wallet" | "refund">("choice");

  // Wallet credit form state
  const [creditPoints, setCreditPoints] = useState("");
  const [creditReason, setCreditReason] = useState("");

  // Refund record form state
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [refundReason, setRefundReason] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  const axiosAuth = useAxiosAuth();
  const creditMutation = useResolveWithWalletCredit();
  const refundMutation = useResolveWithRefundRecord();

  const resetForms = () => {
    setMode("choice");
    setCreditPoints("");
    setCreditReason("");
    setRefundAmount("");
    setRefundMethod("");
    setRefundReference("");
    setRefundDate(new Date().toISOString().split("T")[0]);
    setRefundReason("");
    setProofUrl("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-4 h-4" />
            Resolve Return Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { eligible, eligibleRefundableAmount, resolution } = data;

  const handleProofUpload = async (file: File) => {
    setUploadingProof(true);
    try {
      const result = await uploadService(axiosAuth).uploadImage(file);
      setProofUrl(result.publicUrl || result.url);
      toast.success("Proof uploaded");
    } catch (error: any) {
      toast.error("Failed to upload proof", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setUploadingProof(false);
    }
  };

  const creditPointsValue = Math.max(0, Math.floor(Number(creditPoints) || 0));
  const isCreditValid =
    creditPointsValue > 0 && creditReason.trim().length > 0 && !creditMutation.isPending;

  const handleWalletCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreditValid) return;
    creditMutation.mutate(
      { orderId, points: creditPointsValue, reason: creditReason.trim() },
      { onSuccess: resetForms },
    );
  };

  const refundAmountValue = Math.min(
    Math.max(0, Number(refundAmount) || 0),
    eligibleRefundableAmount,
  );
  const isRefundValid =
    refundAmountValue > 0 &&
    refundMethod.trim().length > 0 &&
    refundReference.trim().length > 0 &&
    !!refundDate &&
    refundReason.trim().length > 0 &&
    !refundMutation.isPending;

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRefundValid) return;
    refundMutation.mutate(
      {
        orderId,
        refundAmount: refundAmountValue,
        refundMethod: refundMethod.trim(),
        refundReference: refundReference.trim(),
        refundProcessedDate: new Date(refundDate).toISOString(),
        reason: refundReason.trim(),
        proofUrl: proofUrl || undefined,
      },
      { onSuccess: resetForms },
    );
  };

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 text-base">
          <Wallet className="w-4 h-4" />
          <span className="min-w-0 break-words">Resolve Return Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        {!eligible && resolution ? (
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Resolved
            </Badge>

            {resolution.resolutionType === "WALLET_CREDIT" ? (
              <div className="min-w-0 space-y-2 text-sm">
                <p className="font-medium break-words">Kay Wallet Credit Granted</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Points Credited</span>
                    <p className="font-semibold">{resolution.pointsCredited} pts</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Date</span>
                    <p className="break-words">{format(new Date(resolution.processedAt), "PPP")}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground">Reason</span>
                  <p className="break-words">{resolution.reason}</p>
                </div>
                <p className="text-xs text-muted-foreground">Processed by Store Admin</p>
              </div>
            ) : (
              <div className="min-w-0 space-y-2 text-sm">
                <p className="font-medium text-amber-600 break-words">
                  Manually Recorded Refund (not an automatic Razorpay refund)
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Amount Refunded</span>
                    <p className="font-semibold">
                      ₹{(resolution.moneyRefunded ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Processed Date</span>
                    <p className="break-words">
                      {resolution.refundProcessedDate
                        ? format(new Date(resolution.refundProcessedDate), "PPP")
                        : "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Method</span>
                    <p className="break-words">{resolution.refundMethod || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Reference / UTR</span>
                    <p className="font-mono text-xs break-all">
                      {resolution.refundReference || "—"}
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground">Reason</span>
                  <p className="break-words">{resolution.reason}</p>
                </div>
                {resolution.proofUrl && (
                  <a
                    href={resolution.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 break-all text-xs text-primary hover:underline"
                  >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="min-w-0 truncate">View proof</span>
                  </a>
                )}
                <p className="text-xs text-muted-foreground">Processed by Store Admin</p>
              </div>
            )}
          </div>
        ) : !eligible ? (
          <p className="text-sm text-muted-foreground">
            This order is not eligible for a return/RTO payment resolution right now.
          </p>
        ) : mode === "choice" ? (
          <div className="space-y-3">
            <p className="break-words text-sm text-muted-foreground">
              This order needs a payment resolution. Eligible refundable amount:{" "}
              <span className="font-semibold text-foreground">
                ₹{eligibleRefundableAmount.toFixed(2)}
              </span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-w-0 justify-start py-3 text-left"
                onClick={() => setMode("wallet")}
              >
                <Wallet className="w-4 h-4 mr-2 shrink-0" />
                <span className="min-w-0 text-left">
                  <span className="block font-medium">1. Add Kay Wallet Credit</span>
                  <span className="block whitespace-normal break-words text-xs font-normal text-muted-foreground">
                    Grant store-credit points to the customer&apos;s Kay Wallet
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-w-0 justify-start py-3 text-left"
                onClick={() => setMode("refund")}
              >
                <Banknote className="w-4 h-4 mr-2 shrink-0" />
                <span className="min-w-0 text-left">
                  <span className="block font-medium">2. Record Online Money Refund</span>
                  <span className="block whitespace-normal break-words text-xs font-normal text-muted-foreground">
                    Record a refund that was processed manually, outside Razorpay
                  </span>
                </span>
              </Button>
            </div>
          </div>
        ) : mode === "wallet" ? (
          <form onSubmit={handleWalletCreditSubmit} className="min-w-0 space-y-4">
            <p className="break-words text-sm text-muted-foreground">
              Eligible refundable amount:{" "}
              <span className="font-semibold text-foreground">
                ₹{eligibleRefundableAmount.toFixed(2)}
              </span>
            </p>
            <div className="min-w-0">
              <Label htmlFor="return-credit-points">Points *</Label>
              <Input
                id="return-credit-points"
                type="number"
                min={1}
                step={1}
                value={creditPoints}
                onChange={(e) => setCreditPoints(e.target.value)}
                disabled={creditMutation.isPending}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="return-credit-reason">Reason *</Label>
              <Textarea
                id="return-credit-reason"
                rows={3}
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Explain why this credit is being issued..."
                disabled={creditMutation.isPending}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least {MIN_REASON_LENGTH} characters ({creditReason.trim().length}/
                {MIN_REASON_LENGTH})
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetForms}
                disabled={creditMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isCreditValid}>
                {creditMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Grant Wallet Credit
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRefundSubmit} className="min-w-0 space-y-4">
            <p className="break-words text-sm text-muted-foreground">
              Eligible refundable amount:{" "}
              <span className="font-semibold text-foreground">
                ₹{eligibleRefundableAmount.toFixed(2)}
              </span>
            </p>
            <div className="min-w-0">
              <Label htmlFor="refund-amount">Refund Amount (₹) *</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                step={0.01}
                max={eligibleRefundableAmount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                disabled={refundMutation.isPending}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="refund-method">Refund Method *</Label>
              <Input
                id="refund-method"
                placeholder="e.g. Bank Transfer, UPI, Razorpay Manual"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                disabled={refundMutation.isPending}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="refund-reference" className="break-words">
                Transaction / Reference / UTR ID *
              </Label>
              <Input
                id="refund-reference"
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                disabled={refundMutation.isPending}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="refund-date">Processed Date *</Label>
              <Input
                id="refund-date"
                type="date"
                value={refundDate}
                onChange={(e) => setRefundDate(e.target.value)}
                disabled={refundMutation.isPending}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="refund-reason">Reason *</Label>
              <Textarea
                id="refund-reason"
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Explain the context of this refund..."
                disabled={refundMutation.isPending}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least {MIN_REASON_LENGTH} characters ({refundReason.trim().length}/
                {MIN_REASON_LENGTH})
              </p>
            </div>
            <div className="min-w-0">
              <Label htmlFor="refund-proof">Proof (Optional)</Label>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  id="refund-proof"
                  type="file"
                  accept="image/*,application/pdf"
                  className="min-w-0 text-sm"
                  disabled={uploadingProof || refundMutation.isPending}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProofUpload(file);
                  }}
                />
                {uploadingProof && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                )}
              </div>
              {proofUrl && (
                <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-green-600">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="min-w-0 break-words">Proof uploaded</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={resetForms}
                disabled={refundMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!isRefundValid}>
                {refundMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Record Refund
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
