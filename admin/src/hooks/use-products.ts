import { useAdminQuery } from "./use-admin-query";
import {
  ProductSortOption,
  productsService,
} from "@/services/products.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: ProductSortOption;
  category?: string;
  status?: "all" | "active" | "disabled";
  isStealDeal?: boolean;
}) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["products", JSON.stringify(params)],
    () => productsService(axiosAuth).getAll(params),
    {
      placeholderData: (previousData) => previousData,
    },
  );
}

// Lightweight count of disabled products, used to decide whether to show
// the "Manage Disabled Products" entry point on the products page.
export function useDisabledProductsCount() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["products", "disabled-count"],
    async () => {
      const result = await productsService(axiosAuth).getAll({
        page: 1,
        limit: 1,
        status: "disabled",
      });
      return result.total ?? 0;
    },
    { showErrorToast: false },
  );
}

export function useProduct(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["product", id],
    () => productsService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => productsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete product", { description: error.message });
    },
  });
}
