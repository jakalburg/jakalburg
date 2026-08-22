"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Loader2, Phone, Mail, Package, Wallet, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/hooks/use-customers";
import { useWalletDetail } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";
import { WalletTransactionList } from "@/components/wallet/wallet-transaction-list";
import { WalletAdjustmentDialog } from "@/components/wallet/wallet-adjustment-dialog";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

interface CustomerDetailSheetProps {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
}

export function CustomerDetailSheet({
  customerId,
  open,
  onClose,
}: CustomerDetailSheetProps) {
  const router = useRouter();
  const { data: customer, isLoading } = useCustomer(customerId || "");
  const { data: wallet, isLoading: isWalletLoading } = useWalletDetail(customerId || undefined);
  const [walletAction, setWalletAction] = useState<"credit" | "debit" | null>(null);

  const initials =
    customer?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "??";

  const phone =
    (customer as any)?.orders?.[0]?.shippingAddress?.contactNo ||
    (customer as any)?.orders?.[0]?.shippingAddress?.phone ||
    customer?.phone ||
    null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        {/* Fixed header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">Customer Details</SheetTitle>
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !customer ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Customer not found
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarImage src={(customer as any).image} alt={customer.name} />
                  <AvatarFallback className="bg-gradient-primary text-white text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-base leading-tight">
                    {customer.name || "N/A"}
                  </h3>
                  {customer.email && (
                    <a
                      href={`mailto:${customer.email}`}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary truncate"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {customer.email}
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-xl font-bold">{customer.totalOrders}</p>
                  <p className="text-xs text-muted-foreground mt-1">Orders</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-lg font-bold leading-tight">
                    ₹{customer.totalSpent?.toFixed(0) || "0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Spent</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-sm font-semibold leading-tight">
                    {customer.createdAt
                      ? format(new Date(customer.createdAt), "MMM yyyy")
                      : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Member since</p>
                </div>
              </div>

              <Separator />

              {/* Order History */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm">Order History</h4>
                </div>

                {(customer as any).orders?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No orders yet
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {(customer as any).orders?.map((order: any) => (
                      <div
                        key={order.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/orders/${order.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/orders/${order.id}`);
                          }
                        }}
                        className="border rounded-lg p-3.5 space-y-2 hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        {/* Top row: order number + status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-sm font-semibold shrink-0 hover:underline">
                              #{order.orderNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs capitalize shrink-0",
                                statusColors[order.status] || "",
                              )}
                            >
                              {order.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Bottom row: date + amount */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground text-xs">
                            {format(new Date(order.createdAt), "MMM dd, yyyy")}
                          </span>
                          <span className="font-semibold">
                            ₹{order.totalAmount?.toFixed(2)}
                          </span>
                        </div>

                        {/* Items preview */}
                        {order.items?.length > 0 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            {order.items[0]?.product?.name
                              ? `: ${order.items[0].product.name}${order.items.length > 1 ? `, +${order.items.length - 1} more` : ""}`
                              : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Kay Wallet */}
              <div>
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">Kay Wallet</h4>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setWalletAction("credit")}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Points
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setWalletAction("debit")}
                    >
                      <Minus className="w-3 h-3 mr-1" />
                      Deduct Points
                    </Button>
                  </div>
                </div>

                {isWalletLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : wallet ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold leading-tight">
                          {wallet.wallet.balancePoints}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Balance (pts)</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold leading-tight">
                          {wallet.wallet.totalCredited}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total Credited</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-lg font-bold leading-tight">
                          {wallet.wallet.totalUsed}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total Used</p>
                      </div>
                    </div>
                    <WalletTransactionList transactions={wallet.transactions} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No wallet found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>

      {customerId && walletAction && (
        <WalletAdjustmentDialog
          userId={customerId}
          currentBalance={wallet?.wallet.balancePoints || 0}
          action={walletAction}
          open={!!walletAction}
          onClose={() => setWalletAction(null)}
        />
      )}
    </Sheet>
  );
}
