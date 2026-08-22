import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "./use-axios-auth";
import API_ENDPOINTS from "@/config/endpoints";
import { toast } from "sonner";
import { useSession } from "@/lib/mock-auth";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailOrderPlaced: boolean;
  emailOrderShipped: boolean;
  emailOrderCancelled: boolean;
  emailLowStock: boolean;
  inAppOrderPlaced: boolean;
  inAppOrderShipped: boolean;
  inAppOrderCancelled: boolean;
}

export function useNotifications(limit?: number) {
  const axiosAuth = useAxiosAuth();
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: async () => {
      const response = await axiosAuth.get<Notification[]>(
        API_ENDPOINTS.notifications.all,
        { params: { limit } },
      );
      return response.data;
    },
    // Only fetch when session is authenticated
    enabled: status === "authenticated" && !!session,
    retry: 1,
    retryDelay: 1000,
    refetchInterval: 30000,
  });
}

export function useNotificationSettings(userId: string | undefined) {
  const axiosAuth = useAxiosAuth();

  return useQuery({
    queryKey: ["notification-settings", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      // The endpoint function expects a string, so we must ensure userId is present
      const url = API_ENDPOINTS.notifications.settings(userId);
      const response = await axiosAuth.get<NotificationSettings>(url);
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      settings,
    }: {
      userId: string;
      settings: Partial<NotificationSettings>;
    }) => {
      const url = API_ENDPOINTS.notifications.settings(userId);
      const response = await axiosAuth.patch(url, settings);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["notification-settings", variables.userId],
      });
      toast.success("Notification settings updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update settings", {
        description: error.message || "Something went wrong",
      });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const url = API_ENDPOINTS.notifications.markRead(id);
      const response = await axiosAuth.patch(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async () => {
      const response = await axiosAuth.patch(
        API_ENDPOINTS.notifications.markAllRead,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });
}
