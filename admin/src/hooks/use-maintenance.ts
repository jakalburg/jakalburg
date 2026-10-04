import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

/**
 * Maintenance mode — the REAL backend (server MaintenanceSettings singleton).
 * Every route here is admin-only, and MaintenanceGuard lets @AdminOnly routes
 * through while maintenance is on, so this screen keeps working when the rest
 * of the API is answering 503. That is what makes it possible to switch back.
 *
 * The preview token is never readable: `hasPreviewToken` says whether one
 * exists, and the plaintext is returned exactly once, by the regenerate call.
 */
export interface MaintenanceSettingsData {
  id?: string;
  active?: boolean;
  title?: string;
  message?: string;
  endsAt?: string | null;
  timezone?: string;
  hasPreviewToken?: boolean;
  previewTokenSetAt?: string | null;
}

export type MaintenanceUpdate = Partial<
  Pick<
    MaintenanceSettingsData,
    "active" | "title" | "message" | "endsAt" | "timezone"
  >
>;

export function useMaintenanceSettings() {
  return useQuery<MaintenanceSettingsData>({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.maintenance.get);
      return data;
    },
  });
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MaintenanceUpdate) => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.settings.maintenance.update,
        payload,
      );
      return data as MaintenanceSettingsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save maintenance settings",
      );
    },
  });
}

/** Returns the new token in plaintext — the only time it is ever visible. */
export function useRegeneratePreviewToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(
        API_ENDPOINTS.settings.maintenance.previewToken,
      );
      return data as { token: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
    },
  });
}

/** Closes every preview link already shared. */
export function useRevokePreviewToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(
        API_ENDPOINTS.settings.maintenance.revokeToken,
      );
      return data as MaintenanceSettingsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
    },
  });
}
