import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";

/**
 * Media storage (Cloudinary / Cloudflare R2) and Redis cache settings — the
 * REAL backend (server StorageSettings singleton). Every route is admin-only;
 * realApi attaches the admin JWT.
 *
 * None of the three secrets is EVER returned: reads expose only
 * `isCloudinaryConfigured` / `isR2Configured` / `isRedisConfigured`. Send a
 * secret to change it, omit it to keep the existing one.
 *
 * NOTE ON POLLING — deliberately absent. The kaybykhushie reference polls
 * redis stats every 5s, redis keys every 10s and storage usage every 30s.
 * Describing a cached key costs two Upstash commands on top of the scan, and
 * the free plan allows 10,000 commands per DAY, so that polling drains a day's
 * budget within minutes of leaving this tab open. Storage usage is just as
 * costly on Cloudinary's 500-calls-per-hour admin API limit. Everything here
 * is fetched once and then only when the user asks.
 */

export type StorageProvider = "cloudinary" | "r2";

export interface StorageSettingsData {
  id?: string;
  storageProvider?: StorageProvider;

  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryStorageLimitBytes?: number | null;
  isCloudinaryConfigured?: boolean;

  r2AccountId?: string;
  r2AccessKeyId?: string;
  r2BucketName?: string;
  r2Endpoint?: string;
  r2PublicUrl?: string;
  r2StorageLimitBytes?: number | null;
  isR2Configured?: boolean;

  redisEnabled?: boolean;
  redisUrl?: string;
  isRedisConfigured?: boolean;
}

/** Write-only secrets on the way in; they never come back out. */
export type StorageSettingsUpdate = Partial<
  Omit<
    StorageSettingsData,
    "id" | "isCloudinaryConfigured" | "isR2Configured" | "isRedisConfigured"
  >
> & {
  cloudinaryApiSecret?: string;
  r2SecretAccessKey?: string;
  redisToken?: string;
};

export interface ProviderUsage {
  provider: StorageProvider;
  configured: boolean;
  usedBytes: number | null;
  usedHuman: string;
  limitBytes: number | null;
  limitHuman: string;
  percentUsed: number | null;
  fileCount: number | null;
  note: string;
  error?: string;
}

export interface StorageUsage {
  provider: StorageProvider;
  cloudinary: ProviderUsage;
  r2: ProviderUsage;
}

export interface RedisStats {
  enabled: boolean;
  reachable: boolean;
  dbSize: number;
  commandsThisUptime: number;
  freeDailyCommandBudget: number;
  message?: string;
}

export interface RedisKeyInfo {
  key: string;
  type: string;
  ttl: number;
}

export function useStorageSettings() {
  return useQuery<StorageSettingsData>({
    queryKey: ["storage-settings"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.storage.get);
      return data;
    },
  });
}

export function useUpdateStorageSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StorageSettingsUpdate) => {
      const { data } = await realApi.patch(
        API_ENDPOINTS.settings.storage.update,
        payload,
      );
      return data as StorageSettingsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["storage-settings"] });
      // Credentials changing can flip both panels' derived state.
      queryClient.invalidateQueries({ queryKey: ["storage-usage"] });
      queryClient.invalidateQueries({ queryKey: ["redis-stats"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to save storage settings",
      );
    },
  });
}

/** Authenticates against the ACTIVE provider without transferring anything. */
export function useVerifyStorage() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(API_ENDPOINTS.settings.storage.verify);
      return data as {
        success: boolean;
        message: string;
        provider: StorageProvider;
      };
    },
  });
}

/**
 * Per-provider usage. `enabled: false` by default — mounting this screen
 * should not spend a Cloudinary admin API call until the user asks for it.
 */
export function useStorageUsage(enabled: boolean) {
  return useQuery<StorageUsage>({
    queryKey: ["storage-usage"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.storage.usage);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useRedisStats(enabled: boolean) {
  return useQuery<RedisStats>({
    queryKey: ["redis-stats"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.redis.stats);
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Capped at 50 keys server-side; `truncated` says whether more exist. */
export function useRedisKeys(enabled: boolean) {
  return useQuery<{ keys: RedisKeyInfo[]; truncated: boolean }>({
    queryKey: ["redis-keys"],
    queryFn: async () => {
      const { data } = await realApi.get(API_ENDPOINTS.settings.redis.keys);
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/** Pings Redis even while caching is toggled off — that's when you test it. */
export function useVerifyRedis() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(API_ENDPOINTS.settings.redis.verify);
      return data as { success: boolean; message: string };
    },
  });
}

export function useFlushCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await realApi.post(API_ENDPOINTS.settings.redis.flush);
      return data as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redis-stats"] });
      queryClient.invalidateQueries({ queryKey: ["redis-keys"] });
    },
  });
}
