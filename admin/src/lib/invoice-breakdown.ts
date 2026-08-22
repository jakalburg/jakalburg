/**
 * Shared payment-breakdown calculation for every invoice/order-summary
 * surface in the admin app (order-details dialog, invoice dialog, order
 * detail page). Reads ONLY the values already stored on the order — never
 * recalculates using current admin settings, so historical invoices stay
 * accurate to what was actually charged at the time.
 *
 * Kay Wallet is a payment method, not a discount: orderTotal never shrinks
 * because wallet points were used — the breakdown below always sums back to
 * orderTotal (walletPaid + onlinePaid + codDue === orderTotal).
 */

export interface InvoiceOrderSnapshot {
  totalAmount?: number | null;
  walletPointsUsed?: number | null;
  walletAmountUsed?: number | null;
  onlineAmountPaid?: number | null;
  codDueAmount?: number | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  status?: string | null;
  deliveryStatus?: string | null;
  razorpayPaymentId?: string | null;
}

export interface InvoicePaymentBreakdown {
  orderTotal: number;
  walletPaid: number;
  onlinePaid: number;
  codDue: number;
  totalPaidSoFar: number;
  outstandingAmount: number;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  isLegacyOrder: boolean;
  isFullyWalletPaid: boolean;
  isCancelledOrRejected: boolean;
  showWalletRow: boolean;
  showOnlineRow: boolean;
  showCodRow: boolean;
  showTotalPaidSoFarRow: boolean;
  codDueLabel: "Outstanding Amount" | "Amount Payable on Delivery";
  showPartialCodNote: boolean;
}

const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

function friendlyPaymentMethod(raw: string | null | undefined): string {
  const normalized = String(raw || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  switch (normalized) {
    case "partialcod":
      return "Partial COD";
    case "kaywallet":
      return "Kay Wallet";
    case "razorpay":
      return "Razorpay";
    case "cod":
      return "Cash on Delivery";
    case "whatsapp":
      return "WhatsApp Order";
    default:
      return raw || "—";
  }
}

export function computeInvoiceBreakdown(order: InvoiceOrderSnapshot): InvoicePaymentBreakdown {
  const orderTotal = round2(Number(order.totalAmount) || 0);
  const rawMethod = String(order.paymentMethod || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const isCancelledOrRejected = ["cancelled", "rejected"].includes(String(order.status || "").toLowerCase());

  const walletPaid = round2(
    Math.max(0, Number(order.walletAmountUsed ?? order.walletPointsUsed ?? 0) || 0),
  );

  // New orders carry an explicit onlineAmountPaid/codDueAmount snapshot.
  // Legacy orders (created before Kay Wallet existed) never had these fields
  // — derive a safe equivalent from paymentMethod/razorpayPaymentId instead,
  // never from current admin settings.
  const hasNewPaymentFields = order.onlineAmountPaid != null || order.codDueAmount != null;
  const isLegacyOrder = !hasNewPaymentFields;

  let onlinePaid: number;
  let codDue: number;

  if (hasNewPaymentFields) {
    onlinePaid = round2(Math.max(0, Number(order.onlineAmountPaid ?? 0) || 0));
    codDue = round2(Math.max(0, Number(order.codDueAmount ?? 0) || 0));
  } else if (rawMethod === "razorpay" || Boolean(order.razorpayPaymentId)) {
    onlinePaid = round2(Math.max(0, orderTotal - walletPaid));
    codDue = 0;
  } else {
    // Legacy COD/WhatsApp/unset — nothing confirmed captured online yet.
    onlinePaid = 0;
    codDue = round2(Math.max(0, orderTotal - walletPaid));
  }

  const totalPaidSoFar = round2(walletPaid + onlinePaid);
  const outstandingAmount = round2(Math.max(0, orderTotal - totalPaidSoFar));

  const deliveryDelivered = String(order.deliveryStatus || "").toLowerCase() === "delivered";
  // Inferred, not authoritative — no dedicated COD-collection-tracking field
  // exists yet. Delivered + COD due is treated as collected for display only.
  const codCollected = codDue > 0 && deliveryDelivered;

  const isFullyWalletPaid = rawMethod === "kaywallet" || (walletPaid >= orderTotal && orderTotal > 0 && onlinePaid === 0 && codDue === 0);

  let paymentStatusLabel: string;
  if (isCancelledOrRejected) {
    paymentStatusLabel = "Cancelled";
  } else if (codDue > 0 && !codCollected) {
    paymentStatusLabel = totalPaidSoFar > 0 ? "Partially Paid" : "Pending";
  } else if (outstandingAmount <= 0 || (codDue > 0 && codCollected)) {
    paymentStatusLabel = isFullyWalletPaid ? "Paid using Kay Wallet" : "Paid";
  } else if (totalPaidSoFar > 0) {
    paymentStatusLabel = "Partially Paid";
  } else {
    paymentStatusLabel = "Pending";
  }

  const isPartialCodMethod = rawMethod === "partialcod";

  return {
    orderTotal,
    walletPaid,
    onlinePaid,
    codDue,
    totalPaidSoFar,
    outstandingAmount,
    paymentMethodLabel: isLegacyOrder && rawMethod === "cod" ? "Cash on Delivery" : friendlyPaymentMethod(order.paymentMethod),
    paymentStatusLabel,
    isLegacyOrder,
    isFullyWalletPaid,
    isCancelledOrRejected,
    showWalletRow: walletPaid > 0,
    showOnlineRow: onlinePaid > 0,
    showCodRow: codDue > 0,
    showTotalPaidSoFarRow: walletPaid > 0 && onlinePaid > 0 && codDue > 0,
    codDueLabel: codDue > 0 ? "Amount Payable on Delivery" : "Outstanding Amount",
    showPartialCodNote: isPartialCodMethod && codDue > 0,
  };
}
