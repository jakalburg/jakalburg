import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

/**
 * SMTP / email delivery settings — the REAL backend (server EmailSettings
 * singleton). Every route is admin-only; realApi attaches the admin JWT.
 *
 * The stored password is NEVER returned: the read exposes only
 * `isSmtpConfigured`. Send `smtpPassword` to change it, omit it to keep the
 * existing one.
 */
export interface EmailSettingsData {
  id?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  /** Where new-order owner notifications are delivered. */
  ownerEmail?: string;
  /** Derived server-side: true when host, user and a password are all present. */
  isSmtpConfigured?: boolean;
}

/** Write-only on the way in; never comes back out. */
export type EmailSettingsUpdate = Partial<
  Omit<EmailSettingsData, "id" | "isSmtpConfigured">
> & { smtpPassword?: string };

export function useEmailSettings() {
  return useQuery<EmailSettingsData>({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.email.get);
      return data;
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmailSettingsUpdate) => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.settings.email.update,
        payload,
      );
      return data as EmailSettingsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save email configuration",
      );
    },
  });
}

/** Opens and authenticates an SMTP connection without sending anything. */
export function useVerifySmtp() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(API_ENDPOINTS.settings.email.verify);
      return data as { success: boolean; message: string };
    },
  });
}
