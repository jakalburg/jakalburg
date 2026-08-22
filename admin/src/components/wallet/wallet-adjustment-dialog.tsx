"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreditWallet, useDebitWallet } from "@/hooks/use-wallet";

const MIN_REASON_LENGTH = 10;

interface WalletAdjustmentDialogProps {
  userId: string;
  currentBalance: number;
  action: "credit" | "debit";
  open: boolean;
  onClose: () => void;
}

export function WalletAdjustmentDialog({
  userId,
  currentBalance,
  action,
  open,
  onClose,
}: WalletAdjustmentDialogProps) {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState("");

  const creditMutation = useCreditWallet();
  const debitMutation = useDebitWallet();
  const mutation = action === "credit" ? creditMutation : debitMutation;

  const pointsValue = Math.max(0, Math.floor(Number(points) || 0));
  const resultingBalance =
    action === "credit" ? currentBalance + pointsValue : currentBalance - pointsValue;

  const isValid =
    pointsValue > 0 &&
    reason.trim().length > 0 &&
    !mutation.isPending &&
    (action === "debit" ? resultingBalance >= 0 : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    mutation.mutate(
      {
        userId,
        points: pointsValue,
        reason: reason.trim(),
        relatedOrderId: relatedOrderId.trim() || undefined,
      },
      {
        onSuccess: () => onClose(),
      },
    );
  };

  const title = action === "credit" ? "Add Points" : "Deduct Points";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "credit" ? (
              <ArrowUpCircle className="w-5 h-5 text-green-600" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {action === "credit"
              ? "Grant Kay Wallet store-credit points to this customer. This is recorded with a full audit trail."
              : "Deduct Kay Wallet store-credit points from this customer. This is recorded with a full audit trail."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="wallet-points">Points *</Label>
            <Input
              id="wallet-points"
              type="number"
              min={1}
              step={1}
              placeholder="e.g. 500"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              disabled={mutation.isPending}
              required
            />
          </div>

          <div>
            <Label htmlFor="wallet-reason">Reason *</Label>
            <Textarea
              id="wallet-reason"
              placeholder="Explain why this adjustment is being made..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={mutation.isPending}
              rows={3}
              required
            />
            <p
              className={cn(
                "text-xs mt-1",
                reason.trim().length > 0 && reason.trim().length < MIN_REASON_LENGTH
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              Must be at least {MIN_REASON_LENGTH} characters ({reason.trim().length}/{MIN_REASON_LENGTH})
            </p>
          </div>

          <div>
            <Label htmlFor="wallet-related-order">Related Order ID (Optional)</Label>
            <Input
              id="wallet-related-order"
              placeholder="Order ID this adjustment relates to"
              value={relatedOrderId}
              onChange={(e) => setRelatedOrderId(e.target.value)}
              disabled={mutation.isPending}
            />
          </div>

          {/* Balance preview */}
          <div className="rounded-md border p-3 grid grid-cols-2 gap-3 text-sm bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Current Balance
              </p>
              <p className="font-semibold mt-0.5">{currentBalance} pts</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                New Balance
              </p>
              <p
                className={cn(
                  "font-semibold mt-0.5",
                  resultingBalance < 0
                    ? "text-destructive"
                    : action === "credit"
                      ? "text-green-600"
                      : "text-red-600",
                )}
              >
                {resultingBalance} pts{" "}
                <span className="font-normal text-xs">
                  ({action === "credit" ? "+" : "-"}
                  {pointsValue})
                </span>
              </p>
            </div>
          </div>

          {action === "debit" && resultingBalance < 0 && (
            <p className="text-xs text-destructive">
              Balance cannot go negative. Reduce the points to deduct.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm {title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
