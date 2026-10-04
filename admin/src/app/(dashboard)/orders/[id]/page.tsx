"use client";

import { useParams, useRouter } from "next/navigation";
import { useOrder, useConfirmOrder, useRejectOrder, useUpdateOrderStatus, useSyncOrderToSheet } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Package,
  User,
  CreditCard,
  Truck,
  Tag,
  CheckCircle,
  XCircle,
  Phone,
  FileText,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatName } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ShipOrderDialog } from "@/components/orders/ship-order-dialog";
import { getTrackingUrl } from "@/lib/tracking-utils";
import { OrderInvoiceDialog } from "@/components/orders/order-invoice-dialog";
import { ResolveReturnPaymentCard } from "@/components/wallet/resolve-return-payment-card";
import { useOrderFundingSources } from "@/hooks/use-wallet";
import { Wallet } from "lucide-react";
import { computeInvoiceBreakdown } from "@/lib/invoice-breakdown";
import { ImageShimmer } from "@/components/ui/image-shimmer";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  confirmed: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  out_for_delivery: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  returned: "bg-red-500/10 text-red-500 border-red-500/20",
  rto_received: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  refunded: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

// Selectable transition targets must match the server OrderStatus enum
// (server/prisma/models/Order.prisma) 1:1 so every choice round-trips to the
// stored value. Offering finer-grained labels (out_for_delivery/rejected/
// rto_received/pending/confirmed) makes the backend fold them onto a coarser
// state (shipped/cancelled/returned/processing) — storing a status the admin
// never picked and then spuriously tripping the "status is unchanged" guard on
// the next save.
const orderStatusOptions = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
];

const formatStatusLabel = (status: string) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

type ReviewableOrder = {
  paymentMethod?: string | null;
  status?: string | null;
};

const getOrderStatus = (order: ReviewableOrder) => String(order?.status || "").toLowerCase();
const isCodOrder = (order: ReviewableOrder) => String(order?.paymentMethod || "").toLowerCase() === "cod";
const canReviewOrder = (order: ReviewableOrder) => getOrderStatus(order) === "pending" && isCodOrder(order);

function PaymentBreakdownSection({ order }: { order: any }) {
  const breakdown = computeInvoiceBreakdown(order);
  const { data: sources, isLoading } = useOrderFundingSources(
    order.id,
    breakdown.walletPaid > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4" />
          Payment Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-semibold">₹{breakdown.orderTotal.toFixed(2)}</span>
          </div>
          {breakdown.showWalletRow && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid using Kay Wallet</span>
              <span className="font-medium text-green-600">
                ₹{breakdown.walletPaid.toFixed(2)}
              </span>
            </div>
          )}
          {breakdown.showOnlineRow && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid Online</span>
              <span className="font-medium text-green-600">
                ₹{breakdown.onlinePaid.toFixed(2)}
              </span>
            </div>
          )}
          {breakdown.showTotalPaidSoFarRow && (
            <div className="flex justify-between text-sm font-semibold">
              <span>Total Paid So Far</span>
              <span className="text-green-600">₹{breakdown.totalPaidSoFar.toFixed(2)}</span>
            </div>
          )}
          {breakdown.showCodRow ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
              <span className="font-semibold text-amber-800">{breakdown.codDueLabel}</span>
              <span className="font-bold text-amber-800">₹{breakdown.codDue.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{breakdown.codDueLabel}</span>
              <span>₹{breakdown.outstandingAmount.toFixed(2)}</span>
            </div>
          )}
          {breakdown.showPartialCodNote && (
            <p className="text-xs italic text-amber-700">
              The amount shown as payable on delivery must be paid to the delivery partner
              when the order is delivered.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Payment Method
            </span>
            <p className="font-semibold mt-1">{breakdown.paymentMethodLabel}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Payment Status
            </span>
            <p className="font-semibold mt-1">{breakdown.paymentStatusLabel}</p>
          </div>
        </div>

        {breakdown.walletPaid <= 0 ? null : isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : sources && sources.length > 0 ? (
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Credit Sources
            </span>
            {sources.map((source, idx) => (
              <div
                key={`${source.lotId}-${idx}`}
                className="text-sm rounded-md border p-2.5 bg-muted/20"
              >
                <p>
                  <span className="font-medium">{source.pointsUsed} pts</span> from credit
                  granted by{" "}
                  <span className="font-medium">
                    {source.grantedByAdminEmail || "System (order cancellation/return reversal)"}
                  </span>
                  , granted on{" "}
                  {format(new Date(source.grantedAt), "MMM dd, yyyy 'at' h:mm a")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Reason: {source.reason}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  // Dialog states
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [showConfirmAction, setShowConfirmAction] = useState(false);
  const [showRejectAction, setShowRejectAction] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  // Queries & Mutations
  const { data: order, isLoading, error } = useOrder(id);
  const confirmMutation = useConfirmOrder();
  const rejectMutation = useRejectOrder();
  const updateStatusMutation = useUpdateOrderStatus();
  const syncSheetMutation = useSyncOrderToSheet();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Order not found</h2>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // The status the admin actually sees and re-selects. The server collapses
  // several admin labels onto one enum value, so it also returns `adminStatus`
  // with the exact choice — prefer it, falling back to the enum for older orders.
  const currentStatus = String(order.adminStatus || order.status || "");

  // Handlers
  const handleConfirm = () => {
    confirmMutation.mutate(order.id, {
      onSuccess: () => setShowConfirmAction(false),
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(
      {
        id: order.id,
        reason: rejectionReason || "Rejected by admin",
      },
      {
        onSuccess: () => {
          setShowRejectAction(false);
          setRejectionReason("");
        },
      },
    );
  };

  const handleShip = () => {
    setShipDialogOpen(true);
  };

  const handleSyncSheet = () => {
    syncSheetMutation.mutate(order.id);
  };

  const handleStatusUpdate = () => {
    const selectedStatus = newStatus || currentStatus;
    updateStatusMutation.mutate(
      {
        id: order.id,
        status: selectedStatus,
        notifyCustomer,
      },
      {
        onSuccess: () => {
          setNotifyCustomer(false);
          // Clear the pending pick so the selector snaps to the freshly saved
          // status once the order refetches (instead of holding the old choice).
          setNewStatus("");
        },
      },
    );
  };

  const customerProfile = order.user?.profiles?.[0];
  const rawCustomerName = customerProfile
    ? `${customerProfile.firstName || ""} ${customerProfile.lastName || ""}`.trim()
    : order.shippingAddress?.firstName
      ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ""}`.trim()
      : "";
  const customerName = formatName(rawCustomerName);
  const displayOrderNumber =
    order.invoiceNumber ||
    (order.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
    order.orderNumber ||
    order.id.slice(-8).toUpperCase();
  const orderStatus = getOrderStatus(order);
  const breakdown = computeInvoiceBreakdown(order);

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 xl:px-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order {displayOrderNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              Placed on {format(new Date(order.createdAt), "PPP p")}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            View Invoice
          </Button> */}
          <Button
            variant="outline"
            onClick={handleSyncSheet}
            disabled={syncSheetMutation.isPending}
          >
            {syncSheetMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Add to Sheet
          </Button>
          {canReviewOrder(order) && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowConfirmAction(true)}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Accept Order
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectAction(true)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject Order
              </Button>
            </>
          )}

          {orderStatus === "processing" && (
            <Button onClick={handleShip}>
              <Truck className="w-4 h-4 mr-2" />
              Ship Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        {/* Main Content - 2 Columns */}
        <div className="min-w-0 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="flex gap-4 items-center border-b last:border-0 pb-4 last:pb-0"
                >
                  <div className="w-14 h-14 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    {(item.product?.thumbnail || item.product?.media?.[0]?.publicUrl) ? (
                      <ImageShimmer
                        src={item.product.thumbnail || item.product.media[0].publicUrl}
                        alt={item.product.name}
                        wrapperClassName="h-full w-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                        No Img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.product ? (
                      <Link
                        href={`/products/${item.productId}`}
                        className="font-medium hover:underline text-primary truncate block"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        Deleted Product
                      </span>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity} × ₹{item.price?.toFixed(2)}
                    </p>
                    {item.variantSnapshot?.selectedColors && item.variantSnapshot.selectedColors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {item.variantSnapshot.selectedColors.map((sel: any, idx: number) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full"
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-border flex-shrink-0"
                              style={{ backgroundColor: sel.hexCode || "#ccc" }}
                            />
                            {sel.productName}: {sel.color}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right font-medium">
                    ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                  </div>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    ₹
                    {(
                      order.items?.reduce(
                        (sum: number, item: any) =>
                          sum + (item.quantity || 0) * (item.price || 0),
                        0,
                      ) ?? 0
                    ).toFixed(2)}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Discount ({order.couponCode})
                    </span>
                    <span>-₹{order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>₹{order.shippingCost?.toFixed(2) || "0.00"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Order Total</span>
                  <span>₹{breakdown.orderTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment & Notes inline */}
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Payment Method</span>
                  <p className="font-medium mt-1">{breakdown.paymentMethodLabel}</p>
                  {order.razorpayPaymentId && (
                    <code className="text-xs text-muted-foreground break-all">{order.razorpayPaymentId}</code>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Payment Status</span>
                  <p className="font-medium mt-1">{breakdown.paymentStatusLabel}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Order Notes</span>
                  {order.orderNote ? (
                    <p className="text-sm mt-1 whitespace-pre-wrap">{order.orderNote}</p>
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground italic">No notes</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Breakdown */}
          <PaymentBreakdownSection order={order} />

          {/* Resolve Return Payment */}
          {(order.status === "returned" || order.status === "rto_received") && (
            <ResolveReturnPaymentCard orderId={order.id} />
          )}

          {/* Delivery Tracking */}
          {order.trackingNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="w-4 h-4" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <span className="text-sm text-muted-foreground">
                    Tracking Number
                  </span>
                  <p className="break-all font-mono">{order.trackingNumber}</p>
                  {getTrackingUrl(
                    order.courierName || "Blue Dart",
                    order.trackingNumber,
                  ) && (
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-blue-600"
                      asChild
                    >
                      <a
                        href={
                          getTrackingUrl(
                            order.courierName || "Blue Dart",
                            order.trackingNumber,
                          )!
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Track on {order.courierName || "Blue Dart"}
                      </a>
                    </Button>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-muted-foreground">Courier</span>
                  <p className="break-words font-medium">
                    {order.courierName || "Blue Dart"}
                  </p>
                </div>
                {order.estimatedDelivery && (
                  <div className="min-w-0">
                    <span className="text-sm text-muted-foreground">
                      Estimated Delivery
                    </span>
                    <p className="break-words">{format(new Date(order.estimatedDelivery), "PPP")}</p>
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize">
                    {formatStatusLabel(order.deliveryStatus || order.status || "in_transit")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - 1 Column */}
        <div className="min-w-0 space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge
                variant="outline"
                className={cn(
                  "w-full justify-center py-1 text-base capitalize",
                  statusColors[currentStatus as keyof typeof statusColors],
                )}
              >
                {formatStatusLabel(currentStatus)}
              </Badge>
              {order.rejectionReason && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  <strong>Reason:</strong> {order.rejectionReason}
                </div>
              )}
              <div className="space-y-2 pt-2 border-t">
                <Label>Existing Status</Label>
                <p className="text-sm font-medium">{formatStatusLabel(currentStatus)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-status">New Order Status</Label>
                <Select
                  value={newStatus || currentStatus}
                  onValueChange={setNewStatus}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger id="new-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox
                  id="notify-customer"
                  checked={notifyCustomer}
                  onCheckedChange={(checked) => setNotifyCustomer(Boolean(checked))}
                  disabled={updateStatusMutation.isPending}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="notify-customer" className="cursor-pointer">
                    Notify customer by email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email is sent only if the selected status changes.
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleStatusUpdate}
                disabled={
                  updateStatusMutation.isPending ||
                  (newStatus || currentStatus) === currentStatus
                }
              >
                {updateStatusMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Status
              </Button>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="w-4 h-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                {/* Navigates to the full customer screen rather than opening
                    the slide-over: from an order you usually want the whole
                    history and the back button, not a peek. Guest orders have
                    no user row, so they stay plain text. */}
                {order.user?.id ? (
                  <Link
                    href={`/customers/${order.user.id}`}
                    className="block font-medium text-primary hover:underline text-left"
                  >
                    {customerName}
                  </Link>
                ) : (
                  <p className="font-medium">{customerName}</p>
                )}
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="break-all">
                  {order.shippingAddress?.email || order.user?.email || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Phone</span>
                {(order.shippingAddress?.contactNo || order.shippingAddress?.phone) ? (
                  <a
                    href={`tel:${order.shippingAddress?.contactNo || order.shippingAddress?.phone}`}
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    {order.shippingAddress?.contactNo || order.shippingAddress?.phone}
                  </a>
                ) : (
                  <p className="text-muted-foreground">N/A</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="w-4 h-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">
              {order.shippingAddress ? (
                <div className="space-y-1">
                  <p className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName || ""}
                  </p>
                  <p>
                    {order.shippingAddress.address ||
                      order.shippingAddress.addressLine1}
                  </p>
                  {order.shippingAddress.addressLine2 && (
                    <p>{order.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city}
                    {order.shippingAddress.state
                      ? `, ${order.shippingAddress.state}`
                      : ""}
                    {order.shippingAddress.zipCode || order.shippingAddress.postalCode
                      ? ` - ${order.shippingAddress.zipCode || order.shippingAddress.postalCode}`
                      : ""}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {(order.shippingAddress.contactNo || order.shippingAddress.phone) && (
                    <a
                      href={`tel:${order.shippingAddress.contactNo || order.shippingAddress.phone}`}
                      className="pt-1 flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {order.shippingAddress.contactNo || order.shippingAddress.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No shipping address provided
                </p>
              )}
            </CardContent>
          </Card>

          {/* Google Sheets Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="w-4 h-4" />
                Google Sheets Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    order.sheetSyncStatus === "synced" &&
                      "bg-green-500/10 text-green-500 border-green-500/20",
                    order.sheetSyncStatus === "failed" &&
                      "bg-red-500/10 text-red-500 border-red-500/20",
                  )}
                >
                  {order.sheetSyncStatus || "pending"}
                </Badge>
              </div>
              {order.sheetSyncedAt && (
                <p className="text-xs text-muted-foreground">
                  Last synced {format(new Date(order.sheetSyncedAt), "PPP p")}
                </p>
              )}
              {order.sheetSyncStatus === "failed" && order.sheetSyncError && (
                <div className="mt-2 flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="break-words">{order.sheetSyncError}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderInvoiceDialog
        order={order}
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />

      <ShipOrderDialog
        open={shipDialogOpen}
        onClose={() => setShipDialogOpen(false)}
        order={order}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["order", id] });
          setShipDialogOpen(false);
        }}
      />

      {/* Accept Confirmation */}
      <AlertDialog open={showConfirmAction} onOpenChange={setShowConfirmAction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this order? This will mark the
              order as processing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation */}
      <AlertDialog open={showRejectAction} onOpenChange={setShowRejectAction}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this order (optional).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Rejection Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., Out of stock, Invalid address..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
