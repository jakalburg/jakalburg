import { AxiosInstance } from "axios";

export const ordersService = (api: AxiosInstance) => ({
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
  }) {
    const response = await api.get("/orders", { params });
    const data = response.data;

    if (data.items) {
      data.items = data.items.map((order: any) => ({
        ...order,
        orderNumber:
          order.invoiceNumber ||
          (order.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
          order.id.slice(-8).toUpperCase(),
        invoiceNumber: order.invoiceNumber,
        invoiceSequence: order.invoiceSequence,
        total: order.totalAmount,
        customer: {
          id: order.userId || "guest",
          name: order.shippingAddress?.firstName
            ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ""}`.trim()
            : order.user?.email || "Guest",
          email: order.shippingAddress?.email || order.user?.email || "",
          totalOrders: 0,
          totalSpent: 0,
          createdAt: order.createdAt,
        },
        items: order.items || [],
      }));
    }

    return data;
  },

  async getApprovedUnshippedOrders() {
    const response = await api.get("/orders", {
      params: {
        status: "processing", // Approved/Confirmed orders
        deliveryStatus: "pending", // Not yet shipped
        limit: 100,
      },
    });

    // Map response to usable format if needed, similar to getAll
    return response.data.items || [];
  },

  // Get single order
  async getById(id: string) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Update order status
  async updateStatus(id: string, status: string, notifyCustomer = false) {
    const response = await api.patch(`/orders/${id}/status`, {
      status,
      notifyCustomer,
    });
    return response.data;
  },

  // Get recent orders
  async getRecent(limit: number = 5) {
    const response = await api.get("/orders", {
      params: { limit, sort: "createdAt:desc" },
    });
    const data = response.data.items || [];

    return data.map((order: any) => ({
      ...order,
      orderNumber:
        order.invoiceNumber ||
        (order.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
        order.id.slice(-8).toUpperCase(),
      invoiceNumber: order.invoiceNumber,
      invoiceSequence: order.invoiceSequence,
      total: order.totalAmount,
      customer: {
        id: order.userId || "guest",
        name: order.shippingAddress?.firstName
          ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName || ""}`.trim()
          : order.user?.email || "Guest",
        email: order.shippingAddress?.email || order.user?.email || "",
        totalOrders: 0,
        totalSpent: 0,
        createdAt: order.createdAt,
      },
      items: order.items || [],
    }));
  },

  // Get order details with full information (admin)
  async getDetails(id: string) {
    const response = await api.get(`/orders/${id}/details`);
    return response.data;
  },

  // Confirm order (pending → processing)
  async confirm(id: string) {
    const response = await api.patch(`/orders/${id}/confirm`);
    return response.data;
  },

  // Reject order
  async reject(id: string, reason?: string) {
    const response = await api.patch(`/orders/${id}/reject`, { reason });
    return response.data;
  },

  // Ship order with tracking
  async ship(
    id: string,
    trackingData: {
      trackingNumber: string;
      courierName?: string;
      estimatedDelivery?: string;
    },
  ) {
    const response = await api.patch(`/orders/${id}/ship`, trackingData);
    return response.data;
  },

  // Permanently delete order (optionally also removes its row from Google Sheets)
  async delete(id: string, removeFromSheet?: boolean) {
    const response = await api.delete(`/orders/${id}`, {
      data: { removeFromSheet: removeFromSheet === true },
    });
    return response.data;
  },

  // Manually (re)sync this order to Google Sheets
  async syncSheet(id: string) {
    const response = await api.post(`/orders/${id}/sync-sheet`);
    return response.data;
  },

  // Create a manual/offline order
  async createManualOrder(data: {
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
  }) {
    const response = await api.post("/orders/manual", data);
    return response.data;
  },
});
