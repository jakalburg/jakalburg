import { useAdminQuery } from "./use-admin-query";
import {
  fabricsService,
  type CreateFabricDto,
  type UpdateFabricDto,
} from "@/services/fabrics.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import useAxiosAuth from "./use-axios-auth";
import type { PaginationParams } from "@/types/pagination";

/** Pull the server's friendly message out of an axios error, if present. */
function errMessage(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
}

export function useFabrics(params?: PaginationParams) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(["fabrics", JSON.stringify(params ?? {})], () =>
    fabricsService(axiosAuth).getAll(params),
  );
}

export function useCreateFabric() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (data: CreateFabricDto) =>
      fabricsService(axiosAuth).create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabrics"] });
      toast.success("Fabric added");
    },
    onError: (error: any) => {
      toast.error("Failed to add fabric", { description: errMessage(error) });
    },
  });
}

export function useUpdateFabric() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFabricDto }) =>
      fabricsService(axiosAuth).update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabrics"] });
      toast.success("Fabric updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update fabric", { description: errMessage(error) });
    },
  });
}

export function useDeleteFabric() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => fabricsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fabrics"] });
      toast.success("Fabric deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete fabric", { description: errMessage(error) });
    },
  });
}
