import { useAdminQuery } from "./use-admin-query";
import { brandsService } from "@/services/brands.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function useBrands() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["brands"], () => brandsService(axiosAuth).getAll());
}

export function useBrand(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["brand", id],
    () => brandsService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (data: any) => brandsService(axiosAuth).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create brand", { description: error.message });
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      brandsService(axiosAuth).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update brand", { description: error.message });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => brandsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete brand", { description: error.message });
    },
  });
}
