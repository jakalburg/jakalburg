"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  useStorageSettings,
  useUpdateStorageSettings,
  useVerifyStorage,
  useStorageUsage,
  useRedisStats,
  useRedisKeys,
  useVerifyRedis,
  useFlushCache,
  type ProviderUsage,
  type StorageProvider,
} from "@/hooks/use-storage-settings";
import { toast } from "sonner";
import {
  Check,
  Cloud,
  HardDrive,
  Loader2,
  Wifi,
  Pencil,
  Database,
  Key,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { SettingsActions } from "./settings-layout";

const GB = 1024 * 1024 * 1024;

/** Bytes <-> GB for the manual-limit inputs. */
const toGb = (bytes: number | null | undefined) =>
  bytes ? String(Number(bytes / GB).toFixed(2)) : "";
const fromGb = (gb: string) => (gb ? Number(gb) * GB : null);

export function StorageTab() {
  // REAL backend (server StorageSettings singleton), not the mock settings blob.
  const { data: settings, isLoading } = useStorageSettings();
  const updateSettings = useUpdateStorageSettings();
  const verifyStorage = useVerifyStorage();
  const verifyRedis = useVerifyRedis();
  const flushCache = useFlushCache();

  // Usage and stats load ONCE on mount and then only on request — see the note
  // in use-storage-settings.ts about the free-tier command budget.
  const storageUsage = useStorageUsage(true);
  const redisStats = useRedisStats(true);

  // The key viewer is the expensive one: a scan plus TYPE+TTL per key. Strictly
  // opt-in, never on mount.
  const [showKeys, setShowKeys] = useState(false);
  const redisKeys = useRedisKeys(showKeys);

  const [storageProvider, setStorageProvider] =
    useState<StorageProvider>("cloudinary");

  const [cloudinaryCloudName, setCloudinaryCloudName] = useState("");
  const [cloudinaryApiKey, setCloudinaryApiKey] = useState("");
  const [cloudinaryApiSecret, setCloudinaryApiSecret] = useState("");
  const [cloudinaryStorageLimitGb, setCloudinaryStorageLimitGb] = useState("");
  const [isEditingCloudinary, setIsEditingCloudinary] = useState(false);

  const [r2AccountId, setR2AccountId] = useState("");
  const [r2AccessKeyId, setR2AccessKeyId] = useState("");
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState("");
  const [r2BucketName, setR2BucketName] = useState("");
  const [r2Endpoint, setR2Endpoint] = useState("");
  const [r2PublicUrl, setR2PublicUrl] = useState("");
  const [r2StorageLimitGb, setR2StorageLimitGb] = useState("");
  const [isEditingR2, setIsEditingR2] = useState(false);

  const [redisUrl, setRedisUrl] = useState("");
  const [redisToken, setRedisToken] = useState("");
  const [isEditingRedis, setIsEditingRedis] = useState(false);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifyingRedis, setIsVerifyingRedis] = useState(false);

  const hydrate = () => {
    if (!settings) return;
    setStorageProvider(settings.storageProvider || "cloudinary");

    setCloudinaryCloudName(settings.cloudinaryCloudName || "");
    setCloudinaryApiKey(settings.cloudinaryApiKey || "");
    setCloudinaryApiSecret("");
    setCloudinaryStorageLimitGb(toGb(settings.cloudinaryStorageLimitBytes));
    setIsEditingCloudinary(false);

    setR2AccountId(settings.r2AccountId || "");
    setR2AccessKeyId(settings.r2AccessKeyId || "");
    setR2SecretAccessKey("");
    setR2BucketName(settings.r2BucketName || "");
    setR2Endpoint(settings.r2Endpoint || "");
    setR2PublicUrl(settings.r2PublicUrl || "");
    setR2StorageLimitGb(toGb(settings.r2StorageLimitBytes));
    setIsEditingR2(false);

    setRedisUrl(settings.redisUrl || "");
    setRedisToken("");
    setIsEditingRedis(false);
  };

  useEffect(hydrate, [settings]);

  const redisEnabled = settings?.redisEnabled ?? false;

  /**
   * The provider switch and the caching toggle persist on click — they are
   * single non-secret fields, and a switch that silently doesn't save until you
   * find a Save button elsewhere is a trap.
   */
  const saveProvider = (provider: StorageProvider) => {
    setStorageProvider(provider);
    updateSettings.mutate(
      { storageProvider: provider },
      {
        onSuccess: () =>
          toast.success(
            `New uploads will go to ${
              provider === "r2" ? "Cloudflare R2" : "Cloudinary"
            }. Existing files are unaffected.`,
          ),
      },
    );
  };

  const toggleCaching = (enabled: boolean) => {
    updateSettings.mutate(
      { redisEnabled: enabled },
      {
        onSuccess: () =>
          toast.success(enabled ? "Caching enabled." : "Caching disabled."),
      },
    );
  };

  const saveCloudinary = () => {
    updateSettings.mutate(
      {
        cloudinaryCloudName,
        cloudinaryApiKey,
        cloudinaryStorageLimitBytes: fromGb(cloudinaryStorageLimitGb),
        // Blank means "keep the stored secret" — never send an empty string.
        ...(cloudinaryApiSecret ? { cloudinaryApiSecret } : {}),
      },
      {
        onSuccess: () => {
          setIsEditingCloudinary(false);
          setCloudinaryApiSecret("");
          toast.success("Cloudinary configuration saved.");
        },
      },
    );
  };

  const saveR2 = () => {
    updateSettings.mutate(
      {
        r2AccountId,
        r2AccessKeyId,
        r2BucketName,
        r2Endpoint,
        r2PublicUrl,
        r2StorageLimitBytes: fromGb(r2StorageLimitGb),
        ...(r2SecretAccessKey ? { r2SecretAccessKey } : {}),
      },
      {
        onSuccess: () => {
          setIsEditingR2(false);
          setR2SecretAccessKey("");
          toast.success("Cloudflare R2 configuration saved.");
        },
      },
    );
  };

  const saveRedis = () => {
    updateSettings.mutate(
      {
        redisUrl,
        ...(redisToken ? { redisToken } : {}),
      },
      {
        onSuccess: () => {
          setIsEditingRedis(false);
          setRedisToken("");
          toast.success("Redis credentials saved.");
        },
      },
    );
  };

  const handleVerifyStorage = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyStorage.mutateAsync();
      if (result.success) toast.success(result.message);
      else toast.error(result.message || "Failed to connect to storage.");
    } catch {
      toast.error("Could not reach the server to verify storage.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyRedis = async () => {
    setIsVerifyingRedis(true);
    try {
      const result = await verifyRedis.mutateAsync();
      if (result.success) toast.success(result.message);
      else toast.error(result.message || "Failed to reach Redis.");
    } catch {
      toast.error("Could not reach the server to verify Redis.");
    } finally {
      setIsVerifyingRedis(false);
    }
  };

  const handleFlush = async () => {
    try {
      const result = await flushCache.mutateAsync();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Could not reach the server to flush the cache.");
    }
  };

  const renderProviderUsage = (usage?: ProviderUsage) => {
    const percent =
      typeof usage?.percentUsed === "number"
        ? Math.min(Math.max(usage.percentUsed, 0), 100)
        : null;

    return (
      <div className="mt-4 rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Storage used
            </p>
            <p className="mt-1 text-sm font-semibold">
              {storageUsage.isLoading
                ? "Loading…"
                : `${usage?.usedHuman ?? "—"} / ${usage?.limitHuman ?? "—"}`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {usage?.fileCount ?? 0} files
          </p>
        </div>
        <Progress value={percent ?? 0} className="mt-2 h-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">
          {usage?.error
            ? usage.error
            : percent === null
              ? usage?.note || "Set a storage limit in this provider's config"
              : `${percent.toFixed(1)}% used — ${usage?.note ?? ""}`}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Caching / Redis */}
      <Card className={redisEnabled ? "border-green-200" : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Global Data Caching</CardTitle>
            <CardDescription>
              Serve repeat storefront reads from Redis instead of the database.
            </CardDescription>
          </div>
          <Wifi
            className={`h-6 w-6 ${
              redisStats.data?.reachable
                ? "text-green-500"
                : "text-muted-foreground"
            }`}
          />
        </CardHeader>
        <CardContent>
          <div className="mt-4 flex items-center space-x-2">
            <Switch
              id="redis-enabled"
              checked={redisEnabled}
              onCheckedChange={toggleCaching}
              disabled={updateSettings.isPending}
            />
            <Label htmlFor="redis-enabled">Enable Caching</Label>
          </div>

          {redisEnabled && !settings?.isRedisConfigured && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Caching is on but no Redis URL and token are saved, so every
                read still goes to the database. Add them below.
              </span>
            </div>
          )}

          {redisEnabled && settings?.isRedisConfigured && (
            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="h-4 w-4" />
                  <span>Cache contents</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {redisStats.data?.dbSize ?? 0} keys
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => redisStats.refetch()}
                    disabled={redisStats.isFetching}
                    title="Refresh statistics"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        redisStats.isFetching ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>

              {/* Upstash's REST API exposes no INFO command, so there are no
                  memory figures to show. Command usage against the free daily
                  budget is the number that actually matters here. */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">
                    Commands this uptime
                  </p>
                  <p className="text-sm font-semibold">
                    {redisStats.data?.commandsThisUptime ?? 0}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      / {redisStats.data?.freeDailyCommandBudget ?? 10000} daily
                      (free plan)
                    </span>
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold">
                    {redisStats.data?.reachable ? "Connected" : "Unreachable"}
                  </p>
                </div>
              </div>

              {redisStats.data?.message && (
                <p className="text-xs text-muted-foreground">
                  {redisStats.data.message}
                </p>
              )}

              {/* Key viewer — opt-in. Listing costs a scan plus two commands
                  per key, so it is never fetched automatically. */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Key className="h-3 w-3" />
                    <span>Cached Keys</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      showKeys ? redisKeys.refetch() : setShowKeys(true)
                    }
                    disabled={redisKeys.isFetching}
                  >
                    {redisKeys.isFetching ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    )}
                    {showKeys ? "Refresh" : "Show keys"}
                  </Button>
                </div>

                {showKeys && (
                  <>
                    <div className="max-h-[200px] divide-y overflow-y-auto rounded-md border bg-slate-50">
                      {(redisKeys.data?.keys ?? []).length === 0 &&
                      !redisKeys.isFetching ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          No cached keys yet. They appear as the storefront is
                          browsed.
                        </p>
                      ) : (
                        (redisKeys.data?.keys ?? []).map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between p-2 text-xs"
                          >
                            <code
                              className="max-w-[240px] truncate rounded bg-blue-100 px-1 text-blue-800"
                              title={item.key}
                            >
                              {item.key}
                            </code>
                            <div className="flex gap-2 text-[10px] text-muted-foreground">
                              <span className="rounded bg-slate-200 px-1">
                                {item.type}
                              </span>
                              {item.ttl > 0 && <span>TTL: {item.ttl}s</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {redisKeys.data?.truncated && (
                      <p className="text-xs text-muted-foreground">
                        Showing the first 50 keys.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleFlush}
              disabled={flushCache.isPending || !settings?.isRedisConfigured}
            >
              {flushCache.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Flush Global Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Redis credentials */}
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Redis Credentials</CardTitle>
              {settings?.isRedisConfigured && (
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="h-3 w-3" /> Configured
                </div>
              )}
            </div>
            <CardDescription>
              Upstash REST endpoint. Paste the URL and token, then Verify.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isEditingRedis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVerifyRedis}
                disabled={isVerifyingRedis}
                title="Ping connection"
              >
                {isVerifyingRedis ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Wifi className="h-4 w-4 text-primary" />
                )}
              </Button>
            )}
            {!isEditingRedis ? (
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingRedis(true);
                  setIsEditingCloudinary(false);
                  setIsEditingR2(false);
                }}
                className="w-full md:w-auto"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="outline"
                  onClick={hydrate}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveRedis}
                  disabled={updateSettings.isPending}
                  className="w-full md:w-auto"
                >
                  Save Config
                </Button>
              </SettingsActions>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label>Redis Endpoint URL</Label>
              <Input
                placeholder="https://xxxx.upstash.io"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
                disabled={!isEditingRedis}
              />
            </div>
            <div className="space-y-2">
              <Label>Redis Auth Token</Label>
              <Input
                type="password"
                placeholder={
                  settings?.isRedisConfigured
                    ? "•••••••• (Set successfully)"
                    : "Enter Redis token"
                }
                value={redisToken}
                onChange={(e) => setRedisToken(e.target.value)}
                disabled={!isEditingRedis}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current token.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider picker */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" /> Media Storage Provider
              </CardTitle>
              <CardDescription>
                Where NEW uploads go. Existing images keep their current URLs
                and are not moved.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => storageUsage.refetch()}
                disabled={storageUsage.isFetching}
                title="Refresh usage"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    storageUsage.isFetching ? "animate-spin" : ""
                  }`}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyStorage}
                disabled={isVerifying}
                className="w-full sm:w-auto"
              >
                {isVerifying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Verify Connection
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                storageProvider === "cloudinary"
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => saveProvider("cloudinary")}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Cloudinary</span>
                </div>
                {storageProvider === "cloudinary" && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Automatic image optimisation and CDN delivery. The default.
              </p>
              {renderProviderUsage(storageUsage.data?.cloudinary)}
            </div>

            <div
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                storageProvider === "r2"
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => saveProvider("r2")}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Cloudflare R2</span>
                </div>
                {storageProvider === "r2" && (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                S3-compatible, zero egress fees. Better for large video or high
                volume.
              </p>
              {renderProviderUsage(storageUsage.data?.r2)}
            </div>
          </div>

          {storageProvider === "r2" && !settings?.isR2Configured && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                R2 is selected but not configured — uploads will fail until the
                credentials below are filled in.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cloudinary configuration */}
      <Card
        className={storageProvider === "cloudinary" ? "border-primary/50" : ""}
      >
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Cloudinary Configuration
              </CardTitle>
              {settings?.isCloudinaryConfigured && (
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="h-3 w-3" /> Configured
                </div>
              )}
            </div>
            <CardDescription>API credentials for Cloudinary.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isEditingCloudinary ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingCloudinary(true);
                  setIsEditingRedis(false);
                  setIsEditingR2(false);
                }}
                className="w-full md:w-auto"
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hydrate}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveCloudinary}
                  disabled={updateSettings.isPending}
                  className="w-full md:w-auto"
                >
                  Save Config
                </Button>
              </SettingsActions>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Cloud Name</Label>
              <Input
                placeholder="dxxxxxxxx"
                value={cloudinaryCloudName}
                onChange={(e) => setCloudinaryCloudName(e.target.value)}
                disabled={!isEditingCloudinary}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                placeholder="123456789012345"
                value={cloudinaryApiKey}
                onChange={(e) => setCloudinaryApiKey(e.target.value)}
                disabled={!isEditingCloudinary}
              />
            </div>
            <div className="space-y-2">
              <Label>API Secret</Label>
              <Input
                type="password"
                placeholder={
                  settings?.isCloudinaryConfigured
                    ? "•••••••• (Set successfully)"
                    : "Enter API secret"
                }
                value={cloudinaryApiSecret}
                onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                disabled={!isEditingCloudinary}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the current secret.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Manual Storage Limit (GB)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="25"
                value={cloudinaryStorageLimitGb}
                onChange={(e) => setCloudinaryStorageLimitGb(e.target.value)}
                disabled={!isEditingCloudinary}
              />
              <p className="text-xs text-muted-foreground">
                Used only if Cloudinary does not report a quota of its own.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* R2 configuration */}
      <Card className={storageProvider === "r2" ? "border-primary/50" : ""}>
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Cloudflare R2 Configuration
              </CardTitle>
              {settings?.isR2Configured && (
                <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="h-3 w-3" /> Configured
                </div>
              )}
            </div>
            <CardDescription>S3-compatible credentials for R2.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isEditingR2 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingR2(true);
                  setIsEditingRedis(false);
                  setIsEditingCloudinary(false);
                }}
                className="w-full md:w-auto"
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hydrate}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveR2}
                  disabled={updateSettings.isPending}
                  className="w-full md:w-auto"
                >
                  Save Config
                </Button>
              </SettingsActions>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Account ID</Label>
              <Input
                value={r2AccountId}
                onChange={(e) => setR2AccountId(e.target.value)}
                disabled={!isEditingR2}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Key ID</Label>
              <Input
                value={r2AccessKeyId}
                onChange={(e) => setR2AccessKeyId(e.target.value)}
                disabled={!isEditingR2}
              />
            </div>
            <div className="space-y-2">
              <Label>Secret Access Key</Label>
              <Input
                type="password"
                placeholder={
                  settings?.isR2Configured
                    ? "•••••••• (Set successfully)"
                    : "Enter secret key"
                }
                value={r2SecretAccessKey}
                onChange={(e) => setR2SecretAccessKey(e.target.value)}
                disabled={!isEditingR2}
              />
            </div>
            <div className="space-y-2">
              <Label>Bucket Name</Label>
              <Input
                value={r2BucketName}
                onChange={(e) => setR2BucketName(e.target.value)}
                disabled={!isEditingR2}
              />
            </div>
            <div className="space-y-2">
              <Label>S3 API Endpoint</Label>
              <Input
                value={r2Endpoint}
                onChange={(e) => setR2Endpoint(e.target.value)}
                placeholder="https://<account-id>.r2.cloudflarestorage.com"
                disabled={!isEditingR2}
              />
            </div>
            <div className="space-y-2">
              <Label>Public Domain URL (CDN)</Label>
              <Input
                value={r2PublicUrl}
                onChange={(e) => setR2PublicUrl(e.target.value)}
                placeholder="https://pub-xxxx.r2.dev"
                disabled={!isEditingR2}
              />
              <p className="text-xs text-muted-foreground">
                Uploads are unreachable without this — it forms the image URL.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Manual Storage Limit (GB)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="100"
                value={r2StorageLimitGb}
                onChange={(e) => setR2StorageLimitGb(e.target.value)}
                disabled={!isEditingR2}
              />
              <p className="text-xs text-muted-foreground">
                R2 is usage-billed, so this limit is for your own tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
