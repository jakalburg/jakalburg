import { useAdminQuery } from "./use-admin-query";
import { ordersService } from "@/services/orders.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function useOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
}) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["orders", JSON.stringify(params)], () =>
    ordersService(axiosAuth).getAll(params),
  );
}

export function useApprovedUnshippedOrders() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["orders", "approved-unshipped"], () =>
    ordersService(axiosAuth).getApprovedUnshippedOrders(),
  );
}

export function useOrder(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["order", id],
    () => ordersService(axiosAuth).getDetails(id), // Use getDetails for full info
    { enabled: !!id },
  );
}

export function useRecentOrders(limit: number = 5) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["recent-orders", limit.toString()], () =>
    ordersService(axiosAuth).getRecent(limit),
  );
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({
      id,
      status,
      notifyCustomer,
    }: {
      id: string;
      status: string;
      notifyCustomer?: boolean;
    }) => ordersService(axiosAuth).updateStatus(id, status, notifyCustomer),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      if (data?.emailError) {
        toast.warning("Order status updated, but the customer email could not be sent.");
      } else if (data?.statusChanged === false) {
        toast.info("Order status is unchanged");
      } else {
        toast.success(data?.emailSent ? "Order status updated and email sent" : "Order status updated");
      }
    },
    onError: (error: any) => {
      toast.error("Failed to update status", { description: error.message });
    },
  });
}

export function useConfirmOrder() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => ordersService(axiosAuth).confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order confirmed successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to confirm order", { description: error.message });
    },
  });
}

export function useRejectOrder() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      ordersService(axiosAuth).reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order rejected");
    },
    onError: (error: any) => {
      toast.error("Failed to reject order", { description: error.message });
    },
  });
}

export function useShipOrder() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, trackingData }: { id: string; trackingData: any }) =>
      ordersService(axiosAuth).ship(id, trackingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order shipped");
    },
    onError: (error: any) => {
      toast.error("Failed to ship order", { description: error.message });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, removeFromSheet }: { id: string; removeFromSheet?: boolean }) =>
      ordersService(axiosAuth).delete(id, removeFromSheet),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (data?.sheetRemovalError) {
        toast.warning("Order deleted, but removing it from Google Sheets failed", {
          description: data.sheetRemovalError,
        });
      } else {
        toast.success(
          data?.sheetRemoved ? "Order deleted and removed from Google Sheets" : "Order deleted",
        );
      }
    },
    onError: (error: any) => {
      toast.error("Failed to delete order", { description: error.message });
    },
  });
}

export function useSyncOrderToSheet() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => ordersService(axiosAuth).syncSheet(id),
    // The endpoint answers 200 with {success:false} when the script or the
    // network rejected the order (bad secret, stale deployment, timeout), so a
    // resolved request is NOT the same as a synced order — the body decides.
    onSuccess: (data: any, id) => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      if (data?.skipped) {
        toast.warning(data.message || "Google Sheets sync isn't configured.");
      } else if (data?.success === false) {
        toast.error("Failed to sync to Google Sheets", { description: data.message });
      } else {
        toast.success(data?.message || "Order synced to Google Sheets");
      }
    },
    onError: (error: any, id) => {
      const description =
        error.response?.data?.message || error.message || "Unknown error";
      console.error(`Google Sheets sync failed for order ${id}:`, error.response?.data || error);
      toast.error("Failed to sync to Google Sheets", { description });
    },
  });
}

export function useSyncOrdersToSheet() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => ordersService(axiosAuth).syncSheet(id)),
      );
      // A rejected request AND a resolved one carrying {success:false} both
      // mean "this order didn't reach the sheet" — counting only rejections
      // would report a clean sweep while rows were silently missing.
      const failed = results.filter(
        (result) =>
          result.status === "rejected" || result.value?.success === false,
      );

      if (failed.length > 0) {
        throw new Error(
          `${ids.length - failed.length} synced, ${failed.length} failed`,
        );
      }

      return { synced: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order"] });
      toast.success(`${data.synced} order${data.synced === 1 ? "" : "s"} synced to Google Sheets`);
    },
    onError: (error: unknown) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.error("Some orders failed to sync to Google Sheets", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
