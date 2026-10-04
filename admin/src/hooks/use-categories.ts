import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  categoriesService,
  type Category,
  type CategoryInput,
} from "@/services/categories.service";
import { DEFAULT_PAGE_SIZE, type Paginated } from "@/types/pagination";

/**
 * Product categories — the REAL backend. These hooks keep the names the
 * existing screens already import; only the seam underneath changed (they ran
 * on mockAxios, so every create/update/delete saved to nothing).
 *
 * The product form's dropdown does NOT come through here — it reads the
 * merged picker via `productsService.getCategories()`. Both are invalidated
 * together below, so creating a category shows up in the form right away.
 */

/** Everything that goes stale when a category is written. */
function invalidateCategoryViews(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["categories"] });
  queryClient.invalidateQueries({ queryKey: ["category"] });
  // The product form's combobox, keyed independently in product-form.tsx.
  queryClient.invalidateQueries({ queryKey: ["product-categories"] });
}

/** Pull the server's message off an axios error without reaching for `any`. */
function errorMessage(error: unknown): string | undefined {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message;
}

/**
 * ONE page of categories for the Catalog → Categories table. Only the rows on
 * screen are fetched; changing page or searching asks the server for the next
 * set rather than filtering a list the browser already holds.
 *
 * `placeholderData` keeps the current page visible while the next one loads,
 * so paging doesn't blink through an empty table.
 */
export function useCategoriesPage(params?: {
  page?: number;
  search?: string;
}) {
  return useQuery<Paginated<Category>>({
    queryKey: ["categories", "page", params?.page ?? 1, params?.search ?? ""],
    queryFn: () =>
      categoriesService.getAll({
        page: params?.page ?? 1,
        limit: DEFAULT_PAGE_SIZE,
        search: params?.search,
      }),
    placeholderData: (previous) => previous,
  });
}

/**
 * EVERY category, for the filter dropdowns on the products screens — a picker
 * has to be able to offer an option that isn't on page 1 of the table.
 */
export function useCategoryOptions() {
  return useQuery<Category[]>({
    queryKey: ["categories", "options"],
    queryFn: () => categoriesService.listOptions(),
    staleTime: 60 * 1000,
  });
}

export function useCategory(id: string) {
  return useQuery<Category>({
    queryKey: ["category", id],
    queryFn: () => categoriesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryInput) => categoriesService.create(data),
    onSuccess: (category) => {
      invalidateCategoryViews(queryClient);
      toast.success(`"${category.name}" created`);
    },
    onError: (error: unknown) => {
      toast.error("Failed to create category", {
        description: errorMessage(error) ?? "Something went wrong",
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryInput> }) =>
      categoriesService.update(id, data),
    onSuccess: (category) => {
      invalidateCategoryViews(queryClient);
      toast.success(`"${category.name}" updated`);
    },
    onError: (error: unknown) => {
      toast.error("Failed to update category", {
        description: errorMessage(error) ?? "Something went wrong",
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesService.delete(id),
    onSuccess: () => {
      invalidateCategoryViews(queryClient);
      toast.success("Category deleted");
    },
    onError: (error: unknown) => {
      // The server refuses to delete a category that products still use, and
      // says how many — surface that rather than a generic failure.
      toast.error("Couldn't delete category", {
        description: errorMessage(error) ?? "Something went wrong",
      });
    },
  });
}
