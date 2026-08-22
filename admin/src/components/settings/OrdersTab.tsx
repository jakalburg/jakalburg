"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Link } from "lucide-react";

export function OrdersTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Management Preferences</CardTitle>
        <CardDescription>
          Configure how orders are tracked, processed, and fulfilled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 border-t">
        <div className="flex flex-col gap-2 rounded-md border p-6">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-muted-foreground" />
            <Label className="text-lg font-semibold">
              Consolidated Under Logistics Hub
            </Label>
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            All order tracking configurations, delivery partner sync settings,
            and fulfillment rules have been migrated to the primary Delivery &
            Fulfillment dashboard for easier management.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
