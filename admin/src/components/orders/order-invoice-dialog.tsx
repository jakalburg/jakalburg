"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Printer } from "lucide-react";
import { computeInvoiceBreakdown } from "@/lib/invoice-breakdown";

const BRAND_BLUE = "#10069F";
const BRAND_BLUE_LIGHT = "#f0f0ff";
const BORDER_COLOR = "#e0e2e8";
const TEXT_DARK = "#1a1a2e";
const TEXT_MUTED = "#6b7280";

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    fontFamily: "'Inter', Arial, sans-serif",
    backgroundColor: "#ffffff",
    color: TEXT_DARK,
    padding: "32px 40px",
    fontSize: "13px",
    lineHeight: "1.6",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "12px" },
  brandName: { fontWeight: "700", fontSize: "20px", color: BRAND_BLUE },
  storeInfo: { marginTop: "5px", fontSize: "11px", color: TEXT_MUTED, lineHeight: "1.5" },
  invoiceLabel: { fontSize: "28px", fontWeight: "800", color: BRAND_BLUE, letterSpacing: "3px", textTransform: "uppercase" as const, lineHeight: "1", textAlign: "right" as const },
  divider: { borderTop: `3px solid ${BRAND_BLUE}`, margin: "10px 0" },
  thinDivider: { borderTop: `1px solid ${BORDER_COLOR}`, margin: "14px 0" },
  twoCol: { display: "flex", justifyContent: "space-between", gap: "24px", marginBottom: "14px" },
  sectionLabel: { fontSize: "10px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase" as const, color: BRAND_BLUE, marginBottom: "6px", paddingBottom: "4px", borderBottom: `2px solid ${BRAND_BLUE_LIGHT}` },
  billToBlock: { flex: "1", minWidth: "0" },
  billToName: { fontWeight: "700", fontSize: "14px", color: TEXT_DARK, marginBottom: "3px" },
  billToDetail: { color: TEXT_MUTED, fontSize: "12px", marginBottom: "2px", lineHeight: "1.4" },
  orderDetailsBlock: { minWidth: "210px", textAlign: "right" as const },
  orderDetailRow: { display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "4px", fontSize: "12px" },
  orderDetailLabel: { color: TEXT_MUTED, minWidth: "110px", textAlign: "right" as const },
  orderDetailValue: { fontWeight: "600", color: TEXT_DARK, textAlign: "right" as const },
  table: { width: "100%", borderCollapse: "collapse" as const, marginBottom: "12px", fontSize: "12px" },
  tableHead: { backgroundColor: BRAND_BLUE_LIGHT, display: "table-header-group" as const },
  th: { padding: "7px 10px", fontWeight: "700", fontSize: "11px", letterSpacing: "0.5px", textTransform: "uppercase" as const, color: BRAND_BLUE, borderTop: `2px solid ${BRAND_BLUE}`, borderBottom: `1px solid ${BORDER_COLOR}`, whiteSpace: "nowrap" as const },
  td: { padding: "7px 10px", borderBottom: `1px solid ${BORDER_COLOR}`, color: TEXT_DARK, verticalAlign: "middle" as const },
  productRow: { breakInside: "avoid" as const, pageBreakInside: "avoid" as const },
  summaryBlock: { breakInside: "avoid" as const, pageBreakInside: "avoid" as const },
  summaryRow: { display: "flex", justifyContent: "flex-end", marginBottom: "12px" },
  summaryBox: { minWidth: "280px", maxWidth: "100%", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", overflow: "hidden" },
  summaryLine: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 12px", borderBottom: `1px solid ${BORDER_COLOR}`, fontSize: "12px" },
  summaryLabelMuted: { color: TEXT_MUTED },
  summaryValue: { fontWeight: "500", color: TEXT_DARK },
  summaryTotal: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "8px 12px", backgroundColor: BRAND_BLUE, fontSize: "13px", fontWeight: "700", color: "#ffffff" },
  breakdownHeader: { padding: "6px 12px", fontSize: "10px", fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" as const, color: BRAND_BLUE, backgroundColor: BRAND_BLUE_LIGHT, borderBottom: `1px solid ${BORDER_COLOR}` },
  summaryLinePaid: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "6px 12px", borderBottom: `1px solid ${BORDER_COLOR}`, fontSize: "12px", backgroundColor: "#f0fdf4" },
  summaryValuePaid: { fontWeight: "700", color: "#16a34a" },
  summaryLineCodDue: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "7px 12px", borderBottom: `1px solid ${BORDER_COLOR}`, fontSize: "12.5px", backgroundColor: "#fffbeb" },
  summaryLabelCodDue: { fontWeight: "700", color: "#92400e" },
  summaryValueCodDue: { fontWeight: "800", color: "#92400e" },
  summaryNote: { padding: "6px 12px", fontSize: "10.5px", fontStyle: "italic" as const, color: "#92400e", backgroundColor: "#fffbeb", borderBottom: `1px solid ${BORDER_COLOR}`, lineHeight: "1.5" },
  metaRow: { display: "flex", justifyContent: "space-between", gap: "12px", padding: "5px 12px", fontSize: "11.5px", borderBottom: `1px solid ${BORDER_COLOR}` },
  metaLabel: { color: TEXT_MUTED },
  metaValue: { fontWeight: "600", color: TEXT_DARK },
  refundBlock: { border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", padding: "8px 12px", marginBottom: "12px", fontSize: "11.5px", lineHeight: "1.6" },
  refundHeading: { fontWeight: "700", fontSize: "12px", marginBottom: "5px" },
  policyBlock: { backgroundColor: "#f9f9fb", border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", padding: "8px 12px", fontSize: "11px", color: TEXT_MUTED, marginBottom: "12px", lineHeight: "1.6" },
  footer: { borderTop: `3px solid ${BRAND_BLUE}`, paddingTop: "10px", textAlign: "center" as const, fontSize: "11px", color: TEXT_MUTED, lineHeight: "1.6" },
  footerBrand: { fontWeight: "700", color: BRAND_BLUE },
};

function formatPrice(amount: number) {
  return `₹${amount.toFixed(2)}`;
}

function formatPaymentMethod(method: string) {
  if (!method) return "—";
  const map: Record<string, string> = { COD: "Cash on Delivery", cod: "Cash on Delivery" };
  return map[method] || method;
}

function capitalizeStatus(status: string) {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function getDisplayOrderNumber(order: any) {
  if (order?.invoiceNumber) return order.invoiceNumber;
  if (order?.invoiceSequence) return String(order.invoiceSequence).padStart(2, "0");
  if (order?.orderNumber) return order.orderNumber;
  if (order?.id) return order.id.slice(-8).toUpperCase();
  return "—";
}

function getInvoiceDocumentTitle(orderNumber: string) {
  return `Invoice-Order-${String(orderNumber || "unknown").replace(/[\\/]+/g, "-")}`;
}

function getReturnResolution(order: any) {
  const r = order?.returnResolution;
  if (!r) return null;
  if (r.resolutionType !== "MONEY_REFUND" && r.resolutionType !== "WALLET_CREDIT") return null;
  return r;
}

interface OrderInvoiceDialogProps {
  order: any;
  open: boolean;
  onClose: () => void;
}

export function OrderInvoiceDialog({ order, open, onClose }: OrderInvoiceDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const addr = order.shippingAddress || {};
  const orderNumber = getDisplayOrderNumber(order);
  const name = `${addr.firstName || ""} ${addr.lastName || ""}`.trim() || "Customer";
  const cart = order.items || [];
  const subtotal = cart.reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const discount = order.discountAmount || 0;
  const shippingCost = order.shippingCost || 0;
  const breakdown = computeInvoiceBreakdown(order);
  const returnResolution = getReturnResolution(order);
  const generatedOn = format(new Date(), "MMMM d, yyyy h:mm a");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`
      <html><head><title>${getInvoiceDocumentTitle(orderNumber)}</title>
      <style>
        html, body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; }
        @page { size: A4; margin: 10mm 12mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-print-wrapper { padding: 0 !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
          thead { display: table-header-group; }
          tr, .product-row { break-inside: avoid; page-break-inside: avoid; }
          .invoice-summary-block { break-inside: avoid; page-break-inside: avoid; }
        }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold">
            Order {orderNumber}
          </DialogTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="mr-6">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div ref={printRef} className="invoice-print-wrapper" style={s.wrapper}>

            {/* HEADER */}
            <div style={s.header}>
              <div>
                <div style={s.brandName}>Kay by Khushie</div>
                <div style={s.storeInfo}>
                  <div>www.kaybykhushie.com</div>
                  <div>kaybykhushie@gmail.com</div>
                </div>
              </div>
              <div style={s.invoiceLabel}>Invoice</div>
            </div>

            {/* DIVIDER */}
            <div style={s.divider} />

            {/* BILL TO + ORDER DETAILS */}
            <div style={s.twoCol}>
              <div style={s.billToBlock}>
                <div style={s.sectionLabel}>Bill To</div>
                <div style={s.billToName}>{name}</div>
                {addr.address && <div style={s.billToDetail}>{addr.address}</div>}
                {addr.city && <div style={s.billToDetail}>{addr.city}{addr.state ? `, ${addr.state}` : ""}{addr.zipCode ? ` - ${addr.zipCode}` : ""}</div>}
                {addr.country && <div style={s.billToDetail}>{addr.country}</div>}
                {(addr.contactNo || addr.phone) && (
                  <div style={{ ...s.billToDetail, marginTop: "6px" }}>📞 {addr.contactNo || addr.phone}</div>
                )}
              </div>

              <div style={s.orderDetailsBlock}>
                <div style={{ ...s.sectionLabel, textAlign: "right" }}>Order Details</div>
                <div style={s.orderDetailRow}>
                  <span style={s.orderDetailLabel}>Order Number</span>
                  <span style={s.orderDetailValue}>{orderNumber}</span>
                </div>
                <div style={s.orderDetailRow}>
                  <span style={s.orderDetailLabel}>Invoice Date</span>
                  <span style={s.orderDetailValue}>
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, yyyy") : "—"}
                  </span>
                </div>
                <div style={s.orderDetailRow}>
                  <span style={s.orderDetailLabel}>Payment Method</span>
                  <span style={s.orderDetailValue}>{formatPaymentMethod(order.paymentMethod)}</span>
                </div>
                <div style={s.orderDetailRow}>
                  <span style={s.orderDetailLabel}>Order Status</span>
                  <span style={{ ...s.orderDetailValue, color: BRAND_BLUE }}>
                    {capitalizeStatus(order.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* PRODUCT TABLE */}
            <table style={s.table}>
              <thead style={s.tableHead}>
                <tr>
                  <th style={{ ...s.th, width: "44px", textAlign: "center" }}>Sr.</th>
                  <th style={{ ...s.th, textAlign: "left" }}>Item Description</th>
                  <th style={{ ...s.th, textAlign: "center", width: "50px" }}>Qty</th>
                  <th style={{ ...s.th, textAlign: "right", width: "100px" }}>Unit Price</th>
                  <th style={{ ...s.th, textAlign: "right", width: "100px" }}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item: any, i: number) => (
                  <tr key={i} className="product-row" style={{ ...s.productRow, backgroundColor: i % 2 === 1 ? "#fafafa" : "#ffffff" }}>
                    <td style={{ ...s.td, textAlign: "center", color: TEXT_MUTED }}>{i + 1}</td>
                    <td style={{ ...s.td, textAlign: "left", fontWeight: "500" }}>
                      {item.product?.name || item.product?.title || "Product"}
                    </td>
                    <td style={{ ...s.td, textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{formatPrice(item.price || 0)}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: "600" }}>
                      {formatPrice((item.price || 0) * (item.quantity || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* SUMMARY + FOOTER — kept together so a partially-full page
                never splits this block; if it can't fit, the whole block
                moves to the next page instead of orphaning the footer. */}
            <div className="invoice-summary-block" style={s.summaryBlock}>
              {/* SUMMARY */}
              <div style={s.summaryRow}>
                <div style={s.summaryBox}>
                  <div style={s.summaryLine}>
                    <span style={s.summaryLabelMuted}>Subtotal</span>
                    <span style={s.summaryValue}>{formatPrice(subtotal)}</span>
                  </div>
                  <div style={s.summaryLine}>
                    <span style={s.summaryLabelMuted}>Shipping</span>
                    <span style={s.summaryValue}>{shippingCost > 0 ? formatPrice(shippingCost) : "Free"}</span>
                  </div>
                  {discount > 0 && (
                    <div style={s.summaryLine}>
                      <span style={s.summaryLabelMuted}>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                      <span style={{ ...s.summaryValue, color: "#16a34a" }}>- {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div style={s.summaryTotal}>
                    <span>Order Total</span>
                    <span>{formatPrice(breakdown.orderTotal)}</span>
                  </div>

                  <div style={s.breakdownHeader}>Payment Breakdown</div>
                  {breakdown.showWalletRow && (
                    <div style={s.summaryLinePaid}>
                      <span style={s.summaryLabelMuted}>Paid using Kay Wallet</span>
                      <span style={s.summaryValuePaid}>{formatPrice(breakdown.walletPaid)}</span>
                    </div>
                  )}
                  {breakdown.showOnlineRow && (
                    <div style={s.summaryLinePaid}>
                      <span style={s.summaryLabelMuted}>Paid Online</span>
                      <span style={s.summaryValuePaid}>{formatPrice(breakdown.onlinePaid)}</span>
                    </div>
                  )}
                  {breakdown.showTotalPaidSoFarRow && (
                    <div style={s.summaryLinePaid}>
                      <span style={{ ...s.summaryLabelMuted, fontWeight: 700, color: TEXT_DARK }}>Total Paid So Far</span>
                      <span style={s.summaryValuePaid}>{formatPrice(breakdown.totalPaidSoFar)}</span>
                    </div>
                  )}
                  {breakdown.showCodRow ? (
                    <div style={s.summaryLineCodDue}>
                      <span style={s.summaryLabelCodDue}>{breakdown.codDueLabel}</span>
                      <span style={s.summaryValueCodDue}>{formatPrice(breakdown.codDue)}</span>
                    </div>
                  ) : (
                    <div style={s.summaryLine}>
                      <span style={s.summaryLabelMuted}>{breakdown.codDueLabel}</span>
                      <span style={s.summaryValue}>{formatPrice(breakdown.outstandingAmount)}</span>
                    </div>
                  )}
                  {breakdown.showPartialCodNote && (
                    <div style={s.summaryNote}>
                      The amount shown as payable on delivery must be paid to the delivery partner when the order is delivered.
                    </div>
                  )}
                  <div style={s.metaRow}>
                    <span style={s.metaLabel}>Payment Method</span>
                    <span style={s.metaValue}>{breakdown.paymentMethodLabel}</span>
                  </div>
                  <div style={{ ...s.metaRow, borderBottom: "none" }}>
                    <span style={s.metaLabel}>Payment Status</span>
                    <span style={s.metaValue}>{breakdown.paymentStatusLabel}</span>
                  </div>
                </div>
              </div>

              {/* REFUND RECORD */}
              {returnResolution && (
                <div
                  style={{
                    ...s.refundBlock,
                    backgroundColor: returnResolution.resolutionType === "MONEY_REFUND" ? "#fffbeb" : "#f0fdf4",
                    borderColor: returnResolution.resolutionType === "MONEY_REFUND" ? "#fde68a" : "#bbf7d0",
                  }}
                >
                  <div
                    style={{
                      ...s.refundHeading,
                      color: returnResolution.resolutionType === "MONEY_REFUND" ? "#92400e" : "#166534",
                    }}
                  >
                    {returnResolution.resolutionType === "MONEY_REFUND"
                      ? "Refund Record"
                      : "Return Resolved via Kay Wallet Credit"}
                  </div>
                  {returnResolution.resolutionType === "MONEY_REFUND" ? (
                    <>
                      <div><strong>Refund Status:</strong> Manually Recorded Refund</div>
                      <div><strong>Refund Amount:</strong> {formatPrice(Number(returnResolution.moneyRefunded) || 0)}</div>
                      <div><strong>Refund Method:</strong> {returnResolution.refundMethod || "—"}</div>
                      <div><strong>Refund Reference:</strong> {returnResolution.refundReference || "—"}</div>
                      <div>
                        <strong>Refund Date:</strong>{" "}
                        {returnResolution.refundProcessedDate
                          ? format(new Date(returnResolution.refundProcessedDate), "MMM d, yyyy")
                          : "—"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div><strong>Points Credited:</strong> {returnResolution.pointsCredited ?? 0} pts</div>
                      <div>
                        <strong>Date:</strong>{" "}
                        {returnResolution.processedAt
                          ? format(new Date(returnResolution.processedAt), "MMM d, yyyy")
                          : "—"}
                      </div>
                      <div><strong>Reason:</strong> {returnResolution.reason || "—"}</div>
                    </>
                  )}
                </div>
              )}

              {/* TRACKING */}
              {order.trackingNumber && (
                <div style={{ border: `1px solid ${BORDER_COLOR}`, borderRadius: "4px", padding: "8px 12px", marginBottom: "12px", backgroundColor: "#f0f7ff", fontSize: "12px" }}>
                  <div style={{ fontWeight: "700", color: BRAND_BLUE, marginBottom: "4px" }}>Tracking Information</div>
                  <div><strong>Courier:</strong> {order.courierName || "Blue Dart"}</div>
                  <div><strong>Tracking ID:</strong> {order.trackingNumber}</div>
                </div>
              )}

              {/* POLICY */}
              <div style={s.policyBlock}>
                <div>
                  <strong style={{ color: TEXT_DARK }}>Return / Exchange Policy:</strong>{" "}
                  As per store policy mentioned on our website at www.kaybykhushie.com.
                </div>
                <div>
                  <strong style={{ color: TEXT_DARK }}>Generated on:</strong> {generatedOn}
                </div>
              </div>

              {/* FOOTER */}
              <div style={s.footer}>
                <div>Thank you for shopping with <span style={s.footerBrand}>Kay by Khushie</span>.</div>
                <div>For support, contact us at <span style={{ color: BRAND_BLUE }}>kaybykhushie@gmail.com</span></div>
                <div style={{ marginTop: "4px", fontSize: "10px", color: "#9ca3af" }}>
                  This is a computer-generated invoice and does not require a signature.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
