import { useAdminQuery } from "./use-admin-query";
import { categoriesService } from "@/services/categories.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function useCategories() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["categories"], () =>
    categoriesService(axiosAuth).getAll(),
  );
}

export function useCategory(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["category", id],
    () => categoriesService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (data: any) =>
      categoriesService(axiosAuth).createWithMedia(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create category", { description: error.message });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      categoriesService(axiosAuth).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update category", { description: error.message });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => categoriesService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete category", { description: error.message });
    },
  });
}
