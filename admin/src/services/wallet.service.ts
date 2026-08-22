import { AxiosInstance } from "axios";

export interface WalletUserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  balancePoints: number;
  totalCredited: number;
  totalUsed: number;
}

export interface Wallet {
  id: string;
  userId: string;
  balancePoints: number;
  totalCredited: number;
  totalUsed: number;
  totalExpired: number;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType =
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "ORDER_PAYMENT"
  | "ORDER_PAYMENT_REVERSAL"
  | "RETURN_CREDIT"
  | "RTO_CREDIT"
  | "MANUAL_ADJUSTMENT"
  | "CREDIT_EXPIRED";

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  sourceOrderId?: string | null;
  returnResolutionId?: string | null;
  createdByAdminId?: string | null;
  checkoutRequestId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
}

export type WalletCreditLotSourceType =
  | "ADMIN_GRANT"
  | "RETURN_CREDIT"
  | "RTO_CREDIT"
  | "ORDER_PAYMENT_REVERSAL"
  | "MANUAL_ADJUSTMENT";

export interface WalletCreditLot {
  id: string;
  walletId: string;
  userId: string;
  originalPoints: number;
  remainingPoints: number;
  sourceOrderId?: string | null;
  sourceType: WalletCreditLotSourceType;
  reason: string;
  grantedByAdminId?: string | null;
  grantedAt: string;
  expiresAt: string;
  expiryStatus: "active" | "expired" | "fully_used";
  reminder30SentAt?: string | null;
  reminder7SentAt?: string | null;
  reminder1SentAt?: string | null;
}

export interface WalletDetail {
  wallet: Wallet;
  transactions: WalletTransaction[];
  lots: WalletCreditLot[];
}

export interface OrderFundingSource {
  pointsUsed: number;
  lotId: string;
  grantedByAdminId?: string | null;
  grantedByAdminEmail?: string | null;
  grantedAt: string;
  sourceType: WalletCreditLotSourceType;
  reason: string;
}

export interface ReturnResolutionOrderSummary {
  id: string;
  status: string;
  onlineAmountPaid: number;
  walletAmountUsed: number;
  totalAmount: number;
}

export type WalletReturnResolutionType = "WALLET_CREDIT" | "MONEY_REFUND";

export interface WalletReturnResolution {
  id: string;
  orderId: string;
  resolutionType: WalletReturnResolutionType;
  pointsCredited?: number | null;
  moneyRefunded?: number | null;
  refundMethod?: string | null;
  refundReference?: string | null;
  refundProcessedDate?: string | null;
  proofUrl?: string | null;
  processedByAdminId: string;
  processedAt: string;
  reason: string;
  walletTransactionId?: string | null;
  creditLotId?: string | null;
}

export interface ReturnResolutionDetail {
  order: ReturnResolutionOrderSummary;
  eligible: boolean;
  eligibleRefundableAmount: number;
  resolution: WalletReturnResolution | null;
}

/**
 * Shape of the `returnResolution` field that may be present directly on an
 * order payload (GET /orders/:id/details) once a cancelled/rejected/returned/
 * rto_received/refunded order's return/RTO has been resolved. Mirrors
 * `WalletReturnResolution` exactly — no separate API call is needed to read
 * it off the order object in invoice/order-summary views.
 */
export type OrderReturnResolution = WalletReturnResolution;

/**
 * Minimal shape of the wallet/payment-related fields the admin order-summary
 * surfaces (invoice dialog, order-details dialog, order-detail page) read
 * off an order object. The order objects returned by the orders API are
 * untyped (`any`) at the call sites, so this is documentation of the real
 * shape rather than an enforced prop type — see `InvoiceOrderSnapshot` in
 * `src/lib/invoice-breakdown.ts` for the subset actually consumed by the
 * shared payment-breakdown calculation.
 */
export interface AdminOrderPaymentFields {
  id: string;
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
  returnResolution?: OrderReturnResolution | null;
}

export const walletService = (api: AxiosInstance) => ({
  // Admin: list users with their wallet balance, optionally searched by name/email/phone
  async searchUsers(search?: string): Promise<WalletUserSummary[]> {
    const response = await api.get("/wallet/admin/users", {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  // Admin: wallet + transactions + credit lots for a given user
  async getWalletDetail(userId: string): Promise<WalletDetail> {
    const response = await api.get(`/wallet/admin/${userId}`);
    return response.data;
  },

  // Admin: grant points to a user's wallet
  async credit(
    userId: string,
    data: { points: number; reason: string; relatedOrderId?: string },
  ) {
    const response = await api.post(`/wallet/admin/${userId}/credit`, data);
    return response.data;
  },

  // Admin: deduct points from a user's wallet
  async debit(
    userId: string,
    data: { points: number; reason: string; relatedOrderId?: string },
  ) {
    const response = await api.post(`/wallet/admin/${userId}/debit`, data);
    return response.data;
  },

  // Admin: which credit lot(s) funded a specific order's wallet payment
  async getOrderFundingSources(orderId: string): Promise<OrderFundingSource[]> {
    const response = await api.get(`/wallet/admin/order-funding/${orderId}`);
    return response.data;
  },

  // Admin: return/RTO payment-resolution status for an order
  async getReturnResolution(orderId: string): Promise<ReturnResolutionDetail> {
    const response = await api.get(`/wallet/admin/return-resolution/${orderId}`);
    return response.data;
  },

  // Admin: resolve a return/RTO by granting a Kay Wallet credit
  async resolveWithWalletCredit(
    orderId: string,
    data: { points: number; reason: string },
  ): Promise<WalletReturnResolution> {
    const response = await api.post(
      `/wallet/admin/return-resolution/${orderId}/wallet-credit`,
      data,
    );
    return response.data;
  },

  // Admin: resolve a return/RTO by recording a manually-processed money refund
  async resolveWithRefundRecord(
    orderId: string,
    data: {
      refundAmount: number;
      refundMethod: string;
      refundReference: string;
      refundProcessedDate: string;
      reason: string;
      proofUrl?: string;
    },
  ): Promise<WalletReturnResolution> {
    const response = await api.post(
      `/wallet/admin/return-resolution/${orderId}/refund-record`,
      data,
    );
    return response.data;
  },
});
