import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

/**
 * Global store identity — the REAL backend (`Settings` singleton).
 *
 * Deliberately separate from `use-settings.ts`: that hook goes through
 * `useAxiosAuth()` → mockAxios, whose router answers "/settings" from an
 * in-memory kaybykhushie blob. Anything saved through it is lost on reload.
 * This one talks to `realApi`, so edits land in Postgres and the storefront
 * picks them up.
 *
 * Every field here is public — `GET /settings` is unauthenticated because the
 * storefront reads it. Never add a credential to this shape.
 */
export interface StoreSettings {
  id: string;

  storeName?: string | null;
  tagline?: string | null;
  logo?: string | null;
  miniLogo?: string | null;
  favicon?: string | null;

  email?: string | null;
  phone?: string | null;
  address?: string | null;
  mapLink?: string | null;

  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  youtubeUrl?: string | null;

  seoTitle?: string | null;
  seoDescription?: string | null;
  siteUrl?: string | null;
}

export const STORE_SETTINGS_KEY = ["store-settings"];

export function useStoreSettings() {
  return useQuery({
    queryKey: STORE_SETTINGS_KEY,
    queryFn: async () => {
      const { data } = await realApi.get<StoreSettings>(
        API_ENDPOINTS.settings.get,
      );
      return data;
    },
  });
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<StoreSettings, "id">>) => {
      const { data } = await realApi.patch<StoreSettings>(
        API_ENDPOINTS.settings.update,
        patch,
      );
      return data;
    },
    onSuccess: (updated) => {
      // Seed the cache with what the server actually stored, so the form
      // re-syncs from the saved row rather than from what we hoped we sent.
      queryClient.setQueryData(STORE_SETTINGS_KEY, updated);
      toast.success("Store settings saved");
    },
    onError: (error: any) => {
      toast.error("Failed to save store settings", {
        description: error?.response?.data?.message || error?.message,
      });
    },
  });
}
