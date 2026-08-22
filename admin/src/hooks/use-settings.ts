import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useAxiosAuth from "./use-axios-auth";
import { toast } from "sonner";
import { useSession } from "@/lib/mock-auth";

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

export function useRedisStats() {
  const axiosAuth = useAxiosAuth();

  return useQuery({
    queryKey: ["redis-stats"],
    queryFn: async () => {
      const { data } = await axiosAuth.get("/settings/redis-stats");
      return data;
    },
    refetchInterval: 5000, // Poll every 5s
  });
}

export function useRedisKeys() {
  const axiosAuth = useAxiosAuth();

  return useQuery({
    queryKey: ["redis-keys"],
    queryFn: async () => {
      const { data } = await axiosAuth.get<any[]>("/settings/redis-keys");
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useStorageUsage() {
  const axiosAuth = useAxiosAuth();

  return useQuery({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data } = await axiosAuth.get("/settings/storage/usage");
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useResetDefaults() {
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosAuth.post("/settings/reset-defaults");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(data.message || "Brand data reset successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to reset brand data", {
        description: error.response?.data?.message || error.message,
      });
    },
  });
}
