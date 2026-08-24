"use client";

import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// The dashboard receives the server's admin order-row shape (totalAmount, user
// with profiles, shippingAddress) — NOT the old mock `Order` (customer.name,
// total). Model that shape loosely and derive display fields defensively so a
// guest order or a missing profile can't crash the whole dashboard.
interface RecentOrderRow {
  id: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  total?: number;
  createdAt?: string | Date;
  items?: unknown[];
  user?: {
    email?: string | null;
    profiles?: { firstName?: string | null; lastName?: string | null }[];
  } | null;
  shippingAddress?: {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  // Tolerate the legacy mock shape too.
  customer?: { name?: string } | null;
}

interface RecentOrdersProps {
  orders: RecentOrderRow[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

/** Best-effort customer name from whichever field the API populated. */
function customerName(order: RecentOrderRow): string {
  if (order.customer?.name) return order.customer.name;

  const profile = order.user?.profiles?.[0];
  const fromProfile = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromProfile) return fromProfile;

  const addr = order.shippingAddress;
  const fromAddress = (
    addr?.fullName ||
    [addr?.firstName, addr?.lastName].filter(Boolean).join(" ")
  )?.trim();
  if (fromAddress) return fromAddress;

  return order.user?.email || "Guest";
}

/** The persisted total, tolerating either field name; 0 if absent. */
function orderTotal(order: RecentOrderRow): number {
  if (typeof order.totalAmount === "number") return order.totalAmount;
  if (typeof order.total === "number") return order.total;
  return 0;
}

export const RecentOrders = React.memo(function RecentOrders({
  orders,
}: RecentOrdersProps) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
        <CardDescription>Latest orders from your store</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent orders found
              </div>
            ) : (
              orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.orderNumber}</p>
                      <Badge
                        variant="outline"
                        className={cn(statusColors[order.status ?? ""])}
                      >
                        {order.status ?? "unknown"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {customerName(order)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.createdAt
                        ? format(new Date(order.createdAt), "MMM dd, yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ₹{orderTotal(order).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items?.length ?? 0} item
                      {(order.items?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
