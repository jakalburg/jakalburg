import { useAdminQuery } from "./use-admin-query";
import { collectionsService } from "@/services/collections.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";
import type { PaginationParams } from "@/types/pagination";

export function useCollections(params?: PaginationParams) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["collections", JSON.stringify(params ?? {})], () =>
    collectionsService(axiosAuth).getAll(params),
  );
}

export function useCollection(id: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["collection", id],
    () => collectionsService(axiosAuth).getById(id),
    { enabled: !!id },
  );
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (data: any) => collectionsService(axiosAuth).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create collection", {
        description: error.message,
      });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      collectionsService(axiosAuth).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update collection", {
        description: error.message,
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => collectionsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete collection", {
        description: error.message,
      });
    },
  });
}
