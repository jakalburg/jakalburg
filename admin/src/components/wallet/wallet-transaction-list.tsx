"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { WalletTransaction } from "@/services/wallet.service";

interface WalletTransactionListProps {
  transactions: WalletTransaction[];
  emptyMessage?: string;
}

// Transaction types that always increase the wallet balance.
const CREDIT_TYPES = new Set<string>([
  "ADMIN_CREDIT",
  "ORDER_PAYMENT_REVERSAL",
  "RETURN_CREDIT",
  "RTO_CREDIT",
]);

// Transaction types initiated directly by an admin (as opposed to system-driven ones).
const ADMIN_TYPES = new Set<string>(["ADMIN_CREDIT", "ADMIN_DEBIT"]);

const formatTypeLabel = (type: string) =>
  type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

export function WalletTransactionList({
  transactions,
  emptyMessage = "No wallet transactions yet",
}: WalletTransactionListProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-2.5">
      {transactions.map((tx) => {
        // MANUAL_ADJUSTMENT can move the balance in either direction; fall back to
        // comparing balanceBefore/After since `points` is always a positive magnitude.
        const isCredit =
          CREDIT_TYPES.has(tx.type) ||
          (tx.type === "MANUAL_ADJUSTMENT" && tx.balanceAfter >= tx.balanceBefore);

        return (
          <div
            key={tx.id}
            className="border rounded-lg p-3.5 space-y-2 hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {isCredit ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatTypeLabel(tx.type)}
                </Badge>
                {ADMIN_TYPES.has(tx.type) && (
                  <span className="text-xs text-muted-foreground shrink-0">By admin</span>
                )}
              </div>
              <span
                className={cn(
                  "font-semibold text-sm shrink-0",
                  isCredit ? "text-green-600" : "text-red-600",
                )}
              >
                {isCredit ? "+" : "-"}
                {tx.points} pts
              </span>
            </div>

            {tx.reason && <p className="text-sm break-words">{tx.reason}</p>}

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
              <span>{format(new Date(tx.createdAt), "MMM dd, yyyy HH:mm")}</span>
              <span>
                Balance: {tx.balanceBefore} &rarr; {tx.balanceAfter} pts
              </span>
            </div>

            {tx.sourceOrderId && (
              <Link
                href={`/orders/${tx.sourceOrderId}`}
                className="text-xs text-primary hover:underline inline-block"
              >
                View related order
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
