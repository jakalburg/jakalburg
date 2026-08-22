import { AxiosInstance } from "axios";

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

export const dashboardService = (api: AxiosInstance) => ({
  // Get dashboard statistics
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await api.get("/dashboard/stats");
      return response.data;
    } catch (error) {
      // Return default stats if endpoint doesn't exist yet
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        revenueChange: 0,
        ordersChange: 0,
        productsChange: 0,
        customersChange: 0,
      };
    }
  },

  // Get sales chart data
  async getSalesData(period: "week" | "month" | "year" = "month") {
    try {
      const response = await api.get("/dashboard/sales", {
        params: { period },
      });
      return response.data;
    } catch (error) {
      return [];
    }
  },
});
