import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

/**
 * Payment configuration — the REAL backend (`PaymentSettings` singleton).
 *
 * On `realApi`, not the mock seam: `useAxiosAuth()` answers "/settings" from
 * in-memory data, so anything saved through it is lost on reload.
 *
 * The key secret is never returned by the API. `isRazorpaySecretSet` is all
 * the form gets, and sending a blank secret leaves the stored one alone.
 */
export interface PaymentSettings {
  id: string;
  codEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayKeyId?: string | null;
  isRazorpaySecretSet: boolean;
}

export interface UpdatePaymentSettings {
  codEnabled?: boolean;
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;
  /** Omit or leave blank to keep the stored secret. */
  razorpayKeySecret?: string;
}

const PAYMENT_SETTINGS_KEY = ["payment-settings"];

export function usePaymentSettings() {
  return useQuery({
    queryKey: PAYMENT_SETTINGS_KEY,
    queryFn: async () => {
      const { data } = await realApi.get<PaymentSettings>(
        API_ENDPOINTS.payments.settings,
      );
      return data;
    },
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: UpdatePaymentSettings) => {
      const { data } = await realApi.patch<PaymentSettings>(
        API_ENDPOINTS.payments.settings,
        patch,
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(PAYMENT_SETTINGS_KEY, updated);
      toast.success("Payment methods updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update payment methods", {
        description: error?.response?.data?.message || error?.message,
      });
    },
  });
}
