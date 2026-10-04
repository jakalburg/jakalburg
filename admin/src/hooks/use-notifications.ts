import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";
import { toPaginated, type Paginated } from "@/types/pagination";

/**
 * Notifications — the REAL backend (server `Notification` +
 * `NotificationSettings`). Previously these hooks ran on `useAxiosAuth()`,
 * i.e. mockAxios: the bell showed invented rows and the preference toggles
 * saved to nothing.
 *
 * The settings call takes no user id. The toggles are store-wide decisions
 * ("email the customer when their order ships"), not personal preferences, and
 * the old per-user URL was keyed off a mock session id that doesn't identify
 * anyone. See the Notification Prisma model for the full reasoning.
 *
 * There is no "create notification" hook on purpose — rows are only ever
 * written by the server when an order event actually happens.
 */

/** Pull the server's message off an axios error without reaching for `any`. */
function errorMessage(error: unknown): string | undefined {
  const message = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message;
}

export interface Notification {
  id: string;
  type: "order_placed" | "order_shipped" | "order_cancelled" | string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationSettings {
  id: string;
  emailOrderPlaced: boolean;
  emailOrderShipped: boolean;
  emailOrderCancelled: boolean;
  inAppOrderPlaced: boolean;
  inAppOrderShipped: boolean;
  inAppOrderCancelled: boolean;
}

export type NotificationSettingsUpdate = Partial<
  Omit<NotificationSettings, "id">
>;

/**
 * Recent notifications for the header bell.
 *
 * Polled once a minute rather than kay's 30s. The bell is mounted on every
 * admin screen, so the interval is a standing cost against a free-tier
 * database for the whole time a tab is open; a new order showing up within a
 * minute is well inside what anyone notices. React Query doesn't poll a
 * backgrounded tab by default, so an idle tab costs nothing.
 */
export function useNotifications(limit?: number) {
  return useQuery({
    queryKey: ["notifications", "bell", limit ?? null],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.notifications.all, {
        params: limit ? { limit } : undefined,
      });
      // The endpoint speaks the standard pagination envelope; the bell only
      // wants the rows. `toPaginated` also tolerates a bare array, so an older
      // API build doesn't blank the bell.
      return toPaginated<Notification>(data, limit ?? 20).data;
    },
    refetchInterval: 60_000,
    // A 401 here means the admin session is gone; retrying just repeats it.
    retry: 1,
  });
}

/** Filters the alerts table sends. All optional; omitted means "no filter". */
export interface NotificationFilters {
  status?: "all" | "unread" | "read";
  type?: string;
  search?: string;
  /**
   * Look back this many days. Expressed as a span rather than an instant so
   * the caller doesn't have to read the clock while rendering — the window is
   * resolved to a `from` timestamp at fetch time, which also means a tab left
   * open overnight asks for the last 7 days, not the 7 days before it loaded.
   */
  withinDays?: number | null;
  page?: number;
  limit?: number;
}

/** The alerts table's envelope: a page of rows plus the global unread count. */
export interface NotificationPage extends Paginated<Notification> {
  unreadTotal: number;
}

/**
 * One filtered page of alerts for the logistics screen.
 *
 * Separate from `useNotifications` on purpose — the bell polls every minute
 * and wants a fixed recent slice, while this is a user-driven table that must
 * not refetch under the reader. They also key differently, so paging the table
 * can't evict the bell's cache.
 */
export function useNotificationsPage(filters: NotificationFilters) {
  return useQuery({
    queryKey: ["notifications", "page", filters],
    queryFn: async () => {
      const { withinDays, ...rest } = filters;
      // Resolved here rather than during render: reading the clock while
      // rendering is impure, and this way the window is measured from the
      // moment of the request.
      const from =
        withinDays != null
          ? new Date(Date.now() - withinDays * 86_400_000).toISOString()
          : undefined;

      const { data } = await realApi.get(API_ENDPOINTS.notifications.all, {
        // Drop empty values so the server sees a clean query string.
        params: Object.fromEntries(
          Object.entries({ ...rest, from }).filter(
            ([, v]) => v !== undefined && v !== "" && v !== "all",
          ),
        ),
      });
      const page = toPaginated<Notification>(data, filters.limit ?? 10);
      return {
        ...page,
        unreadTotal:
          (data as { unreadTotal?: number })?.unreadTotal ??
          page.data.filter((n) => !n.isRead).length,
      } as NotificationPage;
    },
    // Keep the current page visible while the next one loads, so paging and
    // filtering don't flash the skeleton on every click.
    placeholderData: (previous) => previous,
  });
}

export function useNotificationSettings() {
  return useQuery<NotificationSettings>({
    queryKey: ["notification-settings"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.notifications.settings);
      return data;
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: NotificationSettingsUpdate) => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.notifications.settings,
        settings,
      );
      return data as NotificationSettings;
    },
    onSuccess: (data) => {
      // Seed the cache from the response instead of refetching: the screen
      // auto-saves on every toggle, and an invalidate would put a second
      // request behind each one.
      queryClient.setQueryData(["notification-settings"], data);
      toast.success("Notification settings updated");
    },
    onError: (error: unknown) => {
      toast.error("Failed to update settings", {
        description: errorMessage(error) ?? "Something went wrong",
      });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.notifications.markRead(id),
      );
      return data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.notifications.markAllRead,
      );
      return data as { success: boolean; updated: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });
}
