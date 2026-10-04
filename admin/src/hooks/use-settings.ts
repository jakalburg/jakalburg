import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "./use-axios-auth";
import { toast } from "sonner";
import { useSession } from "@/lib/mock-auth";

/**
 * MOCK settings blob, inherited from the kaybykhushie reference.
 *
 * This hook goes through `useAxiosAuth()` → mockAxios, which answers
 * "/settings" from in-memory data — nothing saved here reaches a database.
 * It is kept because the Payments, Delivery, Storage, Email, Alerts and
 * Countdown tabs still read these fields and none of them has a backend yet.
 *
 * The REAL store identity (brand marks, name, contact details, socials, SEO)
 * is a different model on a different seam — see `use-store-settings.ts`. Wire
 * a field up there before trusting it.
 */
interface Settings {
  id: string;
  shippingCost: number;
  taxRate: number;
  currency: string;
  enableAlternatingBg: boolean;
  enablePlainBg: boolean;
  logo?: string;
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  storeDescription: string;
  homeCategory?: string;
  storeMapLink: string;
  enableCOD: boolean;
  enableRazorpay: boolean;
  enablePartialCOD?: boolean;
  partialCODMode?: "fixed" | "percentage";
  partialCODFixedAmountPaise?: number;
  partialCODPercentage?: number;
  enableWhatsApp: boolean;
  whatsappNumber: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  isRazorpayKeySecretSet?: boolean;

  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;

  // Blue Dart Configuration
  blueDartLoginId?: string;
  blueDartLicenceKey?: string;
  blueDartCustomerCode?: string;
  blueDartApiKey?: string;

  // DTDC Configuration
  dtdcUsername?: string;
  dtdcPassword?: string;
  dtdcCustomerCode?: string;
  dtdcApiKey?: string;

  // Delhivery Configuration
  delhiveryApiKey?: string;
  delhiveryClientName?: string;

  // Storage Provider Configuration
  storageProvider?: string;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryStorageLimitBytes?: number;
  isCloudinaryConfigured?: boolean;

  // R2 Configuration
  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  r2BucketName?: string;
  r2Endpoint?: string;
  r2PublicUrl?: string;
  r2StorageLimitBytes?: number;
  isR2Configured?: boolean;

  // Redis Configuration
  redisEnabled?: boolean;
  redisUrl?: string;
  redisToken?: string;
  isRedisConfigured?: boolean;

  // SMTP Configuration
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpFromName?: string;
  isSmtpConfigured?: boolean;

  // Dynamic Header
  headerData?: any;
  homeCategoryDatas?: any;

  // OAuth Configuration
  oauthClientId?: string;
  oauthClientSecret?: string;
  isOauthClientSecretSet?: boolean;
  oauthRedirectUri?: string;
  oauthRedirectUriProd?: string;
  oauthCallbackPath?: string;

  showCoupon?: boolean;
  showCountdown?: boolean;
  countdownTitle?: string;
  countdownMessage?: string;
  countdownTargetAt?: string | Date | null;
  countdownTimezone?: string;
  contactImage?: string;
  aboutSubtitle?: string;
  aboutTitle?: string;
  aboutDescription?: string;
  aboutImageMain?: string;
  aboutVideoMain?: string;
  aboutImageSub?: string;
  founderQuote?: string;
  founderText?: string;
}

export function useSettings(options?: { enabled?: boolean }) {
  const axiosAuth = useAxiosAuth();
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await axiosAuth.get<Settings>("/settings/admin");
      return data;
    },
    enabled: options?.enabled !== false && status === "authenticated",
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async (settings: Partial<Settings>) => {
      const { data } = await axiosAuth.patch("/settings", settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update settings", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}

// The Redis/storage hooks that used to live here were the kaybykhushie
// originals: mock-backed, pointed at routes that don't exist on this API
// (`/settings/redis-stats` — ours is `/settings/redis/stats`) and polling every
// 5/10/30 seconds. Settings → Media uses `@/hooks/use-storage-settings`
// instead, which is on realApi and fetches on demand. Polling that often is
// what the Upstash free plan's 10,000-commands-per-DAY budget cannot survive:
// a 5s poll alone is ~17,000.

