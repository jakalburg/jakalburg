import { useAdminQuery } from "./use-admin-query";
import { pagesService, PageDto } from "@/services/pages.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";

export function usePages() {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery<PageDto[]>(["pages"], () =>
    pagesService(axiosAuth).getAll(),
  );
}

export function usePage(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery<PageDto>(
    ["page", id],
    () => pagesService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => pagesService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete page", { description: error.message });
    },
  });
}
