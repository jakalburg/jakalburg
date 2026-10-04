import { AxiosInstance } from "axios";
import API_ENDPOINTS from "../config/endpoints";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Dashboard service — wired to the real NestJS backend (server
// `DashboardController`, @Controller('dashboard')). Like products / orders /
// customers, every call goes through `realApi`; the injected mock instance is
// accepted for call-site compatibility and ignored on purpose.
//
// Nothing here falls back to zeros on failure any more: a dashboard that
// silently reports ₹0 for a down backend is worse than one that says it
// couldn't load, and useAdminQuery already surfaces the error as a toast.
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueChange: number;
  ordersChange: number;
  productsChange: number;
  customersChange: number;
}

/** One point on the revenue chart. */
export interface SalesPoint {
  name: string;
  revenue: number;
  orders: number;
}

export type SalesPeriod = "week" | "month" | "year";

export const dashboardService = (_api: AxiosInstance) => ({
  /** Headline tiles: all-time totals + their 30-day change. */
  async getStats(): Promise<DashboardStats> {
    const response = await realApi.get<DashboardStats>(
      API_ENDPOINTS.dashboard.stats,
    );
    return response.data;
  },

  /**
   * Revenue + order counts over time. The server returns a continuous series
   * (empty days/months included as zeros), so the chart never joins across a
   * gap and makes a quiet stretch look like steady trade.
   */
  async getSalesData(period: SalesPeriod = "month"): Promise<SalesPoint[]> {
    const response = await realApi.get<SalesPoint[]>(
      API_ENDPOINTS.dashboard.sales,
      { params: { period } },
    );
    return Array.isArray(response.data) ? response.data : [];
  },
});
