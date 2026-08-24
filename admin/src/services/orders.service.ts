import { AxiosInstance } from "axios";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Orders service — wired to the real NestJS backend (like products / fabrics /
// admin-staff / customers). Every call goes through `realApi`, NOT the mock axios
// the rest of the admin still uses; the injected instance is ignored on purpose.
//
// Backend: server `OrdersAdminController` (@Controller('admin/orders')). The lean
// store persists processing|shipped|delivered only; tracking/courier, offline
// orders, and Google Sheets have no backing columns, so those calls are handled
// gracefully client-side (see createManualOrder / syncSheet below).
// ---------------------------------------------------------------------------

export const ordersService = (_api: AxiosInstance) => ({
  // Paged list. Server already returns the admin table shape
  // ({items,total,skip,take,hasMore}); no client-side remap needed.
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
  }) {
    const response = await realApi.get("/admin/orders", { params });
    return response.data;
  },

  // Approved (processing) orders awaiting shipment — used by the delivery flow.
  async getApprovedUnshippedOrders() {
    const response = await realApi.get("/admin/orders", {
      params: { status: "processing", limit: 100 },
    });
    return response.data.items || [];
  },

  // Single order (detail shape).
  async getById(id: string) {
    const response = await realApi.get(`/admin/orders/${id}`);
    return response.data;
  },

  // Update order status.
  async updateStatus(id: string, status: string, notifyCustomer = false) {
    const response = await realApi.patch(`/admin/orders/${id}/status`, {
      status,
      notifyCustomer,
    });
    return response.data;
  },

  // Recent orders (dashboard).
  async getRecent(limit: number = 5) {
    const response = await realApi.get("/admin/orders", {
      params: { limit, sort: "createdAt:desc" },
    });
    return response.data.items || [];
  },

  // Full detail (admin order page).
  async getDetails(id: string) {
    const response = await realApi.get(`/admin/orders/${id}/details`);
    return response.data;
  },

  // Confirm order (→ processing).
  async confirm(id: string) {
    const response = await realApi.patch(`/admin/orders/${id}/confirm`);
    return response.data;
  },

  // Reject order (unsupported by the lean store — surfaces a clear 400).
  async reject(id: string, reason?: string) {
    const response = await realApi.patch(`/admin/orders/${id}/reject`, { reason });
    return response.data;
  },

  // Ship order (status only; tracking fields aren't persisted).
  async ship(
    id: string,
    trackingData: {
      trackingNumber: string;
      courierName?: string;
      estimatedDelivery?: string;
    },
  ) {
    const response = await realApi.patch(`/admin/orders/${id}/ship`, trackingData);
    return response.data;
  },

  // Permanently delete an order. (removeFromSheet is a no-op — no Sheets here.)
  async delete(id: string, _removeFromSheet?: boolean) {
    const response = await realApi.delete(`/admin/orders/${id}`);
    return response.data;
  },

  // Google Sheets isn't configured for this store — resolve as a friendly skip
  // so the "Add to Sheet" buttons don't error.
  async syncSheet(_id: string) {
    return {
      success: true,
      skipped: true,
      message: "Google Sheets sync isn't configured for this store.",
    };
  },

  // Offline/manual orders require a customer account + product mapping the lean
  // model can't yet express, so creation is not available here.
  async createManualOrder(_data: {
    customerName: string;
    contact: string;
    email?: string;
    city: string;
    items: { productId?: string; productName: string; quantity: number; price: number }[];
    totalAmount: number;
    status: string;
    paymentMode: string;
    paymentStatus: string;
    orderDate?: string;
    orderNote?: string;
  }): Promise<never> {
    throw new Error("Offline order creation isn't available yet.");
  },
});
