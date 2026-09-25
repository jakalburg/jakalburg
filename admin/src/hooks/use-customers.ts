import { useAdminQuery } from "./use-admin-query";
import { customersService } from "@/services/customers.service";
import useAxiosAuth from "./use-axios-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["customers", JSON.stringify(params ?? {})], () =>
    customersService(axiosAuth).getAll(params),
  );
}

export function useCustomer(
  id: string,
  params?: { page?: number; limit?: number },
) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    // The page is part of the key so paging the embedded order history
    // refetches rather than serving the first page from cache.
    ["customer", id, JSON.stringify(params ?? {})],
    () => customersService(axiosAuth).getById(id, params),
    { enabled: !!id, placeholderData: (previous) => previous },
  );
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: (id: string) => customersService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
