"use client";

import React from "react";

import { Order } from "@/types/product";
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

interface RecentOrdersProps {
  orders: Order[];
}

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

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
                        className={cn(statusColors[order.status])}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ₹{order.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item
                      {order.items.length !== 1 ? "s" : ""}
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
