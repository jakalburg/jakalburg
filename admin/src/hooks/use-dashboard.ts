import { useAdminQuery } from "./use-admin-query";
import { dashboardService } from "@/services/dashboard.service";
import useAxiosAuth from "./use-axios-auth";

export function useDashboardStats() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["dashboard-stats"], () =>
    dashboardService(axiosAuth).getStats(),
  );
}

export function useSalesData(period: "week" | "month" | "year" = "month") {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["sales-data", period], () =>
    dashboardService(axiosAuth).getSalesData(period),
  );
}
