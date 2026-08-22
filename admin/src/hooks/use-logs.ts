import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminQuery } from "./use-admin-query";
import useAxiosAuth from "./use-axios-auth";
import { logsService } from "@/services/logs.service";
import { ErrorLogQueryParams } from "@/types/log";

export function useErrorLogs(params?: ErrorLogQueryParams) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["logs", JSON.stringify(params)],
    () => logsService(axiosAuth).getAll(params),
    { placeholderData: (previous) => previous },
  );
}

export function useErrorLog(id?: string) {
  const axiosAuth = useAxiosAuth();
  return useAdminQuery(
    ["log", id || ""],
    () => logsService(axiosAuth).getById(id as string),
    { enabled: !!id },
  );
}

export function useUpdateLogStatus() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "resolved" | "unresolved" }) =>
      logsService(axiosAuth).updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["log", variables.id] });
      toast.success(
        variables.status === "resolved" ? "Marked as resolved" : "Marked as unresolved",
      );
    },
    onError: (error: any) => {
      toast.error("Failed to update log status", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

export function useDeleteLog() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (id: string) => logsService(axiosAuth).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success("Log deleted");
    },
    onError: (error: any) => {
      toast.error("Failed to delete log", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

export function useClearLogs() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();
  return useMutation({
    mutationFn: (body: { olderThanDays?: number; ids?: string[] }) =>
      logsService(axiosAuth).clear(body),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      toast.success(`${data?.count ?? 0} log${data?.count === 1 ? "" : "s"} cleared`);
    },
    onError: (error: any) => {
      toast.error("Failed to clear logs", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}
