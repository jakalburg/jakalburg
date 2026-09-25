"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Phone, Mail, Package, ShoppingBag, Wallet, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCustomer } from "@/hooks/use-customers";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";
import { cn } from "@/lib/utils";

// Mirrors the palette used by the customer detail sheet / order detail page so
// an order's status badge reads the same wherever it appears.
const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // The embedded order history is a page, not the whole history — page through
  // it server-side, same as the slide-over sheet does.
  const [orderPage, setOrderPage] = useState(1);
  const {
    data: customer,
    isLoading,
    error,
  } = useCustomer(id, { page: orderPage, limit: TABLE_PAGE_SIZE });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Customer not found</h2>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const initials =
    customer.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "??";

  // Prefer a phone captured on a recent order (the profile phone is often blank).
  const phone =
    (customer as any)?.orders?.[0]?.shippingAddress?.contactNo ||
    (customer as any)?.orders?.[0]?.shippingAddress?.phone ||
    customer.phone ||
    null;

  const orders: any[] = (customer as any).orders ?? [];
  const totalOrders = customer.totalOrders ?? 0;
  const orderTotalPages = Math.max(1, Math.ceil(totalOrders / TABLE_PAGE_SIZE));

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 xl:px-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Details</h1>
          <p className="text-sm text-muted-foreground">
            Profile, lifetime spend and order history
          </p>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        {/* Profile + stats */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-5">
              {/* Profile */}
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarImage src={customer.image || undefined} alt={customer.name} />
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

              <Separator />

              {/* Prominent stats */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">{totalOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Orders</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-2xl font-bold leading-none">
                      ₹{customer.totalSpent?.toFixed(0) || "0"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-base font-semibold leading-tight">
                      {customer.createdAt
                        ? format(new Date(customer.createdAt), "MMM dd, yyyy")
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Member since</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order history */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No orders yet
                </p>
              ) : (
                <div className="space-y-2.5">
                  {orders.map((order: any) => (
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
                      className="border rounded-lg p-3.5 space-y-2 hover:bg-muted/30 transition-colors cursor-pointer"
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
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                          {order.items[0]?.product?.name
                            ? `: ${order.items[0].product.name}${order.items.length > 1 ? `, +${order.items.length - 1} more` : ""}`
                            : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <TablePagination
                currentPage={orderPage}
                totalPages={orderTotalPages}
                total={totalOrders}
                onPageChange={setOrderPage}
                itemLabel="orders"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
