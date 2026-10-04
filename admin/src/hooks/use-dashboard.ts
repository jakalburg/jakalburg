import { useAdminQuery } from "./use-admin-query";
import { dashboardService, type SalesPeriod } from "@/services/dashboard.service";
import useAxiosAuth from "./use-axios-auth";

export function useDashboardStats() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["dashboard-stats"], () =>
    dashboardService(axiosAuth).getStats(),
  );
}

export function useSalesData(period: SalesPeriod = "month") {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["dashboard-sales", period], () =>
    dashboardService(axiosAuth).getSalesData(period),
  );
}
