"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, User, CreditCard, Truck, Tag } from "lucide-react";
import { cn, formatName } from "@/lib/utils";
import { computeInvoiceBreakdown } from "@/lib/invoice-breakdown";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  processing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  delivered: "bg-green-500/10 text-green-500 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
};

function getReturnResolution(order: any) {
  const r = order?.returnResolution;
  if (!r) return null;
  if (r.resolutionType !== "MONEY_REFUND" && r.resolutionType !== "WALLET_CREDIT") return null;
  return r;
}

const getDisplayRazorpayMethod = (method?: string | null) => {
  const value = String(method || "").trim();
  return value && value.toLowerCase() !== "unknown" ? value : "";
};

interface OrderDetailsDialogProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function OrderDetailsDialog({
  order,
  open,
  onClose,
  onRefresh,
}: OrderDetailsDialogProps) {
  const address = order.shippingAddress;
  const profile = order.user?.profiles?.[0];
  const rawName = address?.firstName
    ? `${address.firstName} ${address.lastName || ""}`.trim()
    : profile
      ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
      : "";
  const customerName = formatName(rawName);
  const displayOrderNumber =
    order?.orderNumber ||
    order?.invoiceNumber ||
    (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
    order?.id?.slice(-8).toUpperCase();
  const breakdown = computeInvoiceBreakdown(order);
  const returnResolution = getReturnResolution(order);
  const razorpayMethod = getDisplayRazorpayMethod(order.razorpayMethod);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            View full details for order {displayOrderNumber}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="font-mono text-sm">{displayOrderNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-sm">
                {format(new Date(order.createdAt), "PPP p")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant="outline"
                className={cn(
                  statusColors[order.status as keyof typeof statusColors],
                )}
              >
                {order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery Status</p>
              <p className="text-sm capitalize">
                {order.deliveryStatus || "pending"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4" />
              <h3 className="font-semibold">Customer Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-sm">{customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{order.user?.email || "N/A"}</p>
              </div>
            </div>
            {order.shippingAddress && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  Shipping Address
                </p>
                <p className="text-sm">
                  {order.shippingAddress.address}, {order.shippingAddress.city}
                  <br />
                  {order.shippingAddress.state || ""}{" "}
                  {order.shippingAddress.zipCode}
                  <br />
                  Phone:{" "}
                  {order.shippingAddress.contactNo ||
                    order.shippingAddress.phone ||
                    "N/A"}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4" />
              <h3 className="font-semibold">Payment Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="text-sm font-medium">
                  {order.paymentMethod || "N/A"}
                </p>
              </div>
              {razorpayMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Razorpay Method
                  </p>
                  <p className="text-sm capitalize">{razorpayMethod}</p>
                </div>
              )}
              {order.razorpayPaymentId && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="text-sm font-mono">{order.razorpayPaymentId}</p>
                </div>
              )}
            </div>
          </div>

          {/* Coupon Info */}
          {order.couponCode && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4" />
                  <h3 className="font-semibold">Coupon Applied</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Coupon Code</p>
                    <p className="text-sm font-mono">{order.couponCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <p className="text-sm font-semibold text-green-600">
                      -₹{order.discountAmount?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delivery Tracking */}
          {order.trackingNumber && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4" />
                  <h3 className="font-semibold">Delivery Tracking</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Tracking Number
                    </p>
                    <p className="text-sm font-mono">{order.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Courier</p>
                    <p className="text-sm">{order.courierName || "N/A"}</p>
                  </div>
                  {order.estimatedDelivery && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Delivery
                      </p>
                      <p className="text-sm">
                        {format(new Date(order.estimatedDelivery), "PPP")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Order Items */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" />
              <h3 className="font-semibold">Order Items</h3>
            </div>
            <div className="space-y-3">
              {order.items?.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-start p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.product?.name || (
                        <span className="text-muted-foreground italic">
                          Deleted Product
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × ₹{item.price?.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="space-y-2">
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
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>₹{order.shippingCost?.toFixed(2) || "0.00"}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                </span>
                <span>-₹{order.discountAmount?.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Order Total</span>
              <span>₹{breakdown.orderTotal.toFixed(2)}</span>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-2 pt-3 mt-1 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment Breakdown
              </p>
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
                  <span className="text-green-600">
                    ₹{breakdown.totalPaidSoFar.toFixed(2)}
                  </span>
                </div>
              )}
              {breakdown.showCodRow ? (
                <div className="flex justify-between items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-amber-800">
                    {breakdown.codDueLabel}
                  </span>
                  <span className="font-bold text-amber-800">
                    ₹{breakdown.codDue.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{breakdown.codDueLabel}</span>
                  <span>₹{breakdown.outstandingAmount.toFixed(2)}</span>
                </div>
              )}
              {breakdown.showPartialCodNote && (
                <p className="text-xs italic text-amber-700">
                  The amount shown as payable on delivery must be paid to the delivery
                  partner when the order is delivered.
                </p>
              )}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">{breakdown.paymentMethodLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Status</span>
                <span className="font-medium">{breakdown.paymentStatusLabel}</span>
              </div>
            </div>
          </div>

          {/* Refund Record */}
          {returnResolution && (
            <>
              <Separator />
              <div
                className={cn(
                  "p-3 rounded-lg border",
                  returnResolution.resolutionType === "MONEY_REFUND"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200",
                )}
              >
                <p className="text-sm font-semibold mb-2">
                  {returnResolution.resolutionType === "MONEY_REFUND"
                    ? "Refund Record"
                    : "Return Resolved via Kay Wallet Credit"}
                </p>
                {returnResolution.resolutionType === "MONEY_REFUND" ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Status</p>
                      <p>Manually Recorded Refund</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Amount</p>
                      <p className="font-medium">
                        ₹{(Number(returnResolution.moneyRefunded) || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Method</p>
                      <p>{returnResolution.refundMethod || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Reference</p>
                      <p className="font-mono text-xs break-all">
                        {returnResolution.refundReference || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Refund Date</p>
                      <p>
                        {returnResolution.refundProcessedDate
                          ? format(new Date(returnResolution.refundProcessedDate), "PPP")
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Points Credited</p>
                      <p className="font-medium">
                        {returnResolution.pointsCredited ?? 0} pts
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p>
                        {returnResolution.processedAt
                          ? format(new Date(returnResolution.processedAt), "PPP")
                          : "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Reason</p>
                      <p>{returnResolution.reason || "—"}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Rejection Reason */}
          {order.rejectionReason && (
            <>
              <Separator />
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-semibold text-red-900">
                  Rejection Reason
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {order.rejectionReason}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
