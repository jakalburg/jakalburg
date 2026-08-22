import { useAdminQuery } from "./use-admin-query";
import { customersService } from "@/services/customers.service";
import useAxiosAuth from "./use-axios-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCustomers() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["customers"], () =>
    customersService(axiosAuth).getAll(),
  );
}

export function useCustomer(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["customer", id],
    () => customersService(axiosAuth).getById(id),
    { enabled: !!id },
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
