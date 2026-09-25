import { useAdminQuery } from "./use-admin-query";
import { couponsService } from "@/services/coupons.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";
import type { PaginationParams } from "@/types/pagination";

export function useCoupons(params?: PaginationParams) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["coupons", JSON.stringify(params ?? {})], () =>
    couponsService(axiosAuth).getAll(params),
  );
}

export function useCoupon(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["coupon", id],
    () => couponsService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (data: any) => couponsService(axiosAuth).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create coupon", { description: error.message });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      couponsService(axiosAuth).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update coupon", { description: error.message });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => couponsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete coupon", { description: error.message });
    },
  });
}
