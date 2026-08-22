"use client";

import { useState } from "react";
import { Plus, Truck, Package2, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/hooks/use-orders";
import { getTrackingUrl } from "@/lib/tracking-utils";
import { cn, formatName } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { TableSkeleton } from "@/components/admin/table-skeleton";

const statusColors = {
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  picked_up: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_transit: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  out_for_delivery: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

const getDisplayOrderNumber = (order: any) =>
  order?.orderNumber ||
  order?.invoiceNumber ||
  (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
  order?.id?.slice(-8).toUpperCase();

export function DeliveryTab() {
  const { data: ordersData, isLoading } = useOrders({
    limit: 500,
  });
  const shipments = ((ordersData?.items || []) as any[]).filter((order) =>
    ["shipped", "out_for_delivery", "delivered"].includes(
      String(order.status || "").toLowerCase(),
    ),
  );
  const [activeTab, setActiveTab] = useState("shipments");

  const activeShipments = shipments.filter(
    (s: any) => s.status !== "delivered" && s.status !== "failed",
  );
  const completedShipments = shipments.filter(
    (s: any) => s.status === "delivered" || s.status === "failed",
  );

  const activeCompaniesCount = new Set(
    shipments.map((s) => s.courierName).filter(Boolean),
  ).size;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Shipments
            </CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShipments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shipments.filter((s: any) => s.status === "in_transit").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedShipments.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carriers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCompaniesCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Shipment Tracking</CardTitle>
            <CardDescription>
              Monitor ongoing and completed deliveries
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/settings/delivery">
                <Settings className="w-4 h-4 mr-2" />
                Config
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/delivery/new">
                <Plus className="w-4 h-4 mr-2" />
                New
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="shipments">
                Active ({activeShipments.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedShipments.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="shipments" className="mt-4">
              {isLoading ? (
                <TableSkeleton rows={5} columns={7} />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Tracking</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Est. Delivery</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeShipments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No active shipments
                            </TableCell>
                          </TableRow>
                        ) : (
                          activeShipments.map((shipment: any) => (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-medium font-mono text-xs">
                                {getDisplayOrderNumber(shipment)}
                              </TableCell>
                              <TableCell>
                                {formatName(
                                  `${shipment.shippingAddress?.firstName || ""} ${shipment.shippingAddress?.lastName || ""}`,
                                )}
                              </TableCell>
                              <TableCell>
                                {shipment.courierName || "N/A"}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {shipment.trackingNumber}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    statusColors[
                                      shipment.status as keyof typeof statusColors
                                    ],
                                  )}
                                >
                                  {shipment.status?.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {shipment.estimatedDelivery
                                  ? format(
                                      new Date(shipment.estimatedDelivery),
                                      "MMM dd, yyyy",
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {getTrackingUrl(
                                  shipment.courierName,
                                  shipment.trackingNumber,
                                ) && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a
                                      href={
                                        getTrackingUrl(
                                          shipment.courierName,
                                          shipment.trackingNumber,
                                        )!
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  {activeShipments.length === 0 ? (
                    <div className="grid md:hidden text-center py-8 text-muted-foreground">
                      No active shipments
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                      {activeShipments.map((shipment: any) => (
                        <Card key={shipment.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              {/* Header: Order ID and Status */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Order Number
                                  </p>
                                  <p className="font-medium font-mono text-sm">
                                    {getDisplayOrderNumber(shipment)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    statusColors[
                                      shipment.status as keyof typeof statusColors
                                    ],
                                  )}
                                >
                                  {shipment.status?.replace("_", " ")}
                                </Badge>
                              </div>

                              <div className="border-t pt-3 space-y-2">
                                {/* Customer */}
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Customer
                                  </p>
                                  <p className="text-sm font-medium">
                                    {formatName(
                                      `${shipment.shippingAddress?.firstName || ""} ${shipment.shippingAddress?.lastName || ""}`,
                                    )}
                                  </p>
                                </div>

                                {/* Carrier and Tracking */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Carrier
                                    </p>
                                    <p className="text-sm">
                                      {shipment.courierName || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Tracking #
                                    </p>
                                    <p className="text-xs font-mono">
                                      {shipment.trackingNumber}
                                    </p>
                                  </div>
                                </div>

                                {/* Est. Delivery */}
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Est. Delivery
                                  </p>
                                  <p className="text-sm">
                                    {shipment.estimatedDelivery
                                      ? format(
                                          new Date(shipment.estimatedDelivery),
                                          "MMM dd, yyyy",
                                        )
                                      : "-"}
                                  </p>
                                </div>
                              </div>

                              {/* Tracking Link */}
                              {getTrackingUrl(
                                shipment.courierName,
                                shipment.trackingNumber,
                              ) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  asChild
                                >
                                  <a
                                    href={
                                      getTrackingUrl(
                                        shipment.courierName,
                                        shipment.trackingNumber,
                                      )!
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Track Package
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (
                <>
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Carrier</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Delivered On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedShipments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No completed shipments
                            </TableCell>
                          </TableRow>
                        ) : (
                          completedShipments.map((shipment: any) => (
                            <TableRow key={shipment.id}>
                              <TableCell className="font-medium font-mono text-xs">
                                {getDisplayOrderNumber(shipment)}
                              </TableCell>
                              <TableCell>
                                {formatName(
                                  `${shipment.shippingAddress?.firstName || ""} ${shipment.shippingAddress?.lastName || ""}`,
                                )}
                              </TableCell>
                              <TableCell>
                                {shipment.courierName || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    statusColors[
                                      shipment.status as keyof typeof statusColors
                                    ],
                                  )}
                                >
                                  {shipment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {shipment.updatedAt
                                  ? format(
                                      new Date(shipment.updatedAt),
                                      "MMM dd, yyyy HH:mm",
                                    )
                                  : "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile View */}
                  {completedShipments.length === 0 ? (
                    <div className="grid md:hidden text-center py-8 text-muted-foreground">
                      No completed shipments
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                      {completedShipments.map((shipment: any) => (
                        <Card key={shipment.id}>
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              {/* Header: Order ID and Status */}
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Order Number
                                  </p>
                                  <p className="font-medium font-mono text-sm">
                                    {getDisplayOrderNumber(shipment)}
                                  </p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    statusColors[
                                      shipment.status as keyof typeof statusColors
                                    ],
                                  )}
                                >
                                  {shipment.status}
                                </Badge>
                              </div>

                              <div className="border-t pt-3 space-y-2">
                                {/* Customer */}
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Customer
                                  </p>
                                  <p className="text-sm font-medium">
                                    {formatName(
                                      `${shipment.shippingAddress?.firstName || ""} ${shipment.shippingAddress?.lastName || ""}`,
                                    )}
                                  </p>
                                </div>

                                {/* Carrier and Delivered On */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Carrier
                                    </p>
                                    <p className="text-sm">
                                      {shipment.courierName || "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Delivered On
                                    </p>
                                    <p className="text-xs">
                                      {shipment.updatedAt
                                        ? format(
                                            new Date(shipment.updatedAt),
                                            "MMM dd",
                                          )
                                        : "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
