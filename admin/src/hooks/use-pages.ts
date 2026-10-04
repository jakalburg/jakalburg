import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pagesService, PageDto } from "@/services/pages.service";
import { DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

// Static pages run on the REAL backend — `pagesService` talks to realApi
// directly, so these hooks no longer take an axios instance.

/**
 * ONE page of static pages for the Website → Static Pages table. Only the rows
 * on screen are fetched; paging and searching ask the server for the next set.
 *
 * `placeholderData` keeps the current rows visible while the next page loads.
 */
export function usePagesPage(params?: { page?: number; search?: string }) {
  return useQuery<Paginated<PageDto>>({
    queryKey: ["pages", "page", params?.page ?? 1, params?.search ?? ""],
    queryFn: () =>
      pagesService.getAll({
        page: params?.page ?? 1,
        limit: DEFAULT_PAGE_SIZE,
        search: params?.search,
      }),
    placeholderData: (previous) => previous,
  });
}

export function usePage(id: string) {
  return useQuery<PageDto>({
    queryKey: ["page", id],
    queryFn: () => pagesService.getById(id),
    enabled: !!id,
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pagesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete page", {
        description: error?.response?.data?.message || error?.message,
      });
    },
  });
}

/** Creates any default page that is missing; leaves edited pages untouched. */
export function useSeedPages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => pagesService.seed(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success(data?.message || "Default pages seeded");
    },
    onError: (error: any) => {
      toast.error("Failed to seed default pages", {
        description: error?.response?.data?.message || error?.message,
      });
    },
  });
}
