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
import {
  useSettings,
  useUpdateSettings,
  useRedisStats,
  useRedisKeys,
  useStorageUsage,
} from "@/hooks/use-settings";
import useAxiosAuth from "@/hooks/use-axios-auth";
import API_ENDPOINTS from "@/config/endpoints";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Check,
  Cloud,
  HardDrive,
  Loader2,
  Wifi,
  Pencil,
  Database,
  Key,
} from "lucide-react";
import { SettingsActions } from "./settings-layout";

export function StorageTab() {
  const { data: storeSettings, isLoading } = useSettings();
  const { data: redisStats } = useRedisStats();
  const { data: redisKeys } = useRedisKeys();
  const { data: storageUsage, isLoading: isStorageUsageLoading } =
    useStorageUsage();
  const updateStoreMutation = useUpdateSettings();
  const api = useAxiosAuth();

  const [storageProvider, setStorageProvider] = useState("cloudinary");
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
  const [isVerifying, setIsVerifying] = useState(false);

  const [redisEnabled, setRedisEnabled] = useState(false);
  const [redisUrl, setRedisUrl] = useState("");
  const [redisToken, setRedisToken] = useState("");
  const [isEditingRedis, setIsEditingRedis] = useState(false);
  const [isVerifyingRedis, setIsVerifyingRedis] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  useEffect(() => {
    if (storeSettings) {
      setStorageProvider(storeSettings.storageProvider || "cloudinary");

      setCloudinaryCloudName(storeSettings.cloudinaryCloudName || "");
      setCloudinaryApiKey(storeSettings.cloudinaryApiKey || "");
      setCloudinaryApiSecret("");
      setCloudinaryStorageLimitGb(
        storeSettings.cloudinaryStorageLimitBytes
          ? String(
              Number(
                storeSettings.cloudinaryStorageLimitBytes / 1024 / 1024 / 1024,
              ).toFixed(2),
            )
          : "",
      );
      setIsEditingCloudinary(false);

      setR2AccountId(storeSettings.r2AccountId || "");
      setR2AccessKeyId(storeSettings.r2AccessKeyId || "");
      setR2SecretAccessKey("");
      setR2BucketName(storeSettings.r2BucketName || "");
      setR2Endpoint(storeSettings.r2Endpoint || "");
      setR2PublicUrl(storeSettings.r2PublicUrl || "");
      setR2StorageLimitGb(
        storeSettings.r2StorageLimitBytes
          ? String(
              Number(
                storeSettings.r2StorageLimitBytes / 1024 / 1024 / 1024,
              ).toFixed(2),
            )
          : "",
      );
      setIsEditingR2(false);

      setRedisEnabled(storeSettings.redisEnabled ?? false);
      setRedisUrl(storeSettings.redisUrl || "");
      setRedisToken("");
      setIsEditingRedis(false);
    }
  }, [storeSettings]);

  const handleSaveProviderSelection = (provider: string) => {
    setStorageProvider(provider);
    updateStoreMutation.mutate(
      { storageProvider: provider },
      {
        onSuccess: () => {
          if (provider === "cloudinary") setIsEditingCloudinary(false);
          if (provider === "r2") setIsEditingR2(false);
        },
      },
    );
  };

  const handleSaveCloudinary = () => {
    // Only include the secret if it was actually changed (non-empty)
    const updatePayload: any = {
      cloudinaryCloudName,
      cloudinaryApiKey,
      cloudinaryStorageLimitBytes: cloudinaryStorageLimitGb
        ? Number(cloudinaryStorageLimitGb) * 1024 * 1024 * 1024
        : null,
    };

    // Only update secret if user explicitly entered a new one
    if (cloudinaryApiSecret && cloudinaryApiSecret.trim() !== "") {
      updatePayload.cloudinaryApiSecret = cloudinaryApiSecret;
    }

    updateStoreMutation.mutate(updatePayload, {
      onSuccess: () => {
        setIsEditingCloudinary(false);
        setCloudinaryApiSecret(""); // Clear the input after save
      },
    });
  };

  const handleSaveR2 = () => {
    // Only include the secret if it was actually changed (non-empty)
    const updatePayload: any = {
      r2AccountId,
      r2AccessKeyId,
      r2BucketName,
      r2Endpoint,
      r2PublicUrl,
      r2StorageLimitBytes: r2StorageLimitGb
        ? Number(r2StorageLimitGb) * 1024 * 1024 * 1024
        : null,
    };

    // Only update secret if user explicitly entered a new one
    if (r2SecretAccessKey && r2SecretAccessKey.trim() !== "") {
      updatePayload.r2SecretAccessKey = r2SecretAccessKey;
    }

    updateStoreMutation.mutate(updatePayload, {
      onSuccess: () => {
        setIsEditingR2(false);
        setR2SecretAccessKey(""); // Clear the input after save
      },
    });
  };

  const handleSaveRedis = () => {
    // Only include the token if it was actually changed (non-empty)
    const updatePayload: any = {
      redisEnabled,
      redisUrl,
    };

    // Only update token if user explicitly entered a new one
    if (redisToken && redisToken.trim() !== "") {
      updatePayload.redisToken = redisToken;
    }

    updateStoreMutation.mutate(updatePayload, {
      onSuccess: () => {
        setIsEditingRedis(false);
        setRedisToken("");
        toast.success("Redis settings updated");
      },
    });
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const response = await api.post("/settings/clear-cache");
      if (response.data?.success) {
        toast.success("Cache cleared successfully");
      } else {
        toast.error("Failed to clear cache", {
          description: response.data?.message || "Unknown error",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while clearing the cache");
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleVerifyStorage = async () => {
    setIsVerifying(true);
    try {
      const response = await api.post(API_ENDPOINTS.settings.verifyStorage);
      if (response.data?.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || "Failed to connect to storage");
      }
    } catch (error) {
      toast.error("Could not reach server to verify storage.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyRedis = async () => {
    setIsVerifyingRedis(true);
    try {
      const response = await api.post(API_ENDPOINTS.settings.verifyRedis);
      if (response.data?.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || "Failed to reach Redis Server.");
      }
    } catch (error) {
      toast.error("Could not reach backend to verify Redis.");
    } finally {
      setIsVerifyingRedis(false);
    }
  };

  const getStoragePercent = (usage: any) =>
    typeof usage?.percentUsed === "number"
      ? Math.min(Math.max(usage.percentUsed, 0), 100)
      : null;

  const renderProviderUsage = (usage: any) => {
    const percent = getStoragePercent(usage);

    return (
      <div className="mt-4 rounded-lg border bg-muted/20 p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Storage used
            </p>
            <p className="mt-1 text-sm font-semibold">
              {isStorageUsageLoading
                ? "Loading..."
                : `${usage?.usedHuman || "0 B"} / ${
                    usage?.limitHuman || "Provider quota"
                  }`}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {usage?.fileCount ?? 0} files
          </p>
        </div>
        <Progress value={percent ?? 0} className="mt-2 h-1.5" />
        <p className="mt-2 text-xs text-muted-foreground">
          {percent === null
            ? "Set a storage limit in this provider's config"
            : `${percent.toFixed(1)}% used`}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Caching / Redis */}
      <Card className={redisEnabled ? "border-green-200" : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl">Global Data Caching</CardTitle>
            <CardDescription>
              Boost Next.js performance using Redis memory caching.
            </CardDescription>
          </div>
          <Wifi
            className={`h-6 w-6 ${redisEnabled ? "text-green-500" : "text-muted-foreground"}`}
          />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="redis-enabled"
              checked={redisEnabled}
              onCheckedChange={setRedisEnabled}
            />
            <Label htmlFor="redis-enabled">Enable Caching</Label>
          </div>

          {redisEnabled && redisStats?.enabled && (
            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="h-4 w-4" />
                  <span>Memory Usage (Upstash)</span>
                </div>
                <span className="font-medium">
                  {redisStats?.memoryUsedHuman || "0 MB"} /{" "}
                  {redisStats?.memoryMaxHuman || "256 MB"}
                </span>
              </div>
              <Progress
                value={
                  redisStats?.memoryMax
                    ? (redisStats.memoryUsed / redisStats.memoryMax) * 100
                    : 0
                }
                className="h-2"
              />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-muted/50 p-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Keys Cached</p>
                  <p className="text-sm font-semibold">
                    {redisStats?.dbSize ?? 0}
                  </p>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Redis Uptime</p>
                  <p className="text-sm font-semibold">
                    {redisStats?.uptime
                      ? Math.round(redisStats.uptime / 3600)
                      : 0}{" "}
                    hrs
                  </p>
                </div>
              </div>

              {/* Redis Keys Viewer */}
              {redisKeys && redisKeys.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Key className="h-3 w-3" />
                    <span>Cached Keys</span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y bg-slate-50">
                    {redisKeys.map((item: any) => (
                      <div
                        key={item.key}
                        className="p-2 flex items-center justify-between text-xs"
                      >
                        <code
                          className="bg-blue-100 text-blue-800 px-1 rounded truncate max-w-[200px]"
                          title={item.key}
                        >
                          {item.key}
                        </code>
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span className="bg-slate-200 px-1 rounded">
                            {item.type}
                          </span>
                          {item.ttl > 0 && <span>TTL: {item.ttl}s</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearingCache || !redisEnabled}
            >
              {isClearingCache && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Flush Global Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Redis Credentials</CardTitle>
              {storeSettings?.isRedisConfigured && (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  <Check className="h-3 w-3" /> Configured
                </div>
              )}
              {!isEditingRedis && (
                <button
                  onClick={handleVerifyRedis}
                  disabled={isVerifyingRedis}
                  title="Ping Connection"
                  className="sm:hidden ml-auto"
                >
                  {isVerifyingRedis ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Wifi className="h-4 w-4 text-primary" />
                  )}
                </button>
              )}
            </div>
            <CardDescription>REST endpoint for caching.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {!isEditingRedis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleVerifyRedis}
                disabled={isVerifyingRedis}
                title="Ping Connection"
                className="hidden sm:flex md:w-auto"
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
                <Pencil className="w-4 h-4 mr-2" />
                Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="outline"
                  onClick={() => setIsEditingRedis(false)}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveRedis} className="w-full md:w-auto">
                  Save Config
                </Button>
              </SettingsActions>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className={`space-y-4 pt-4 border-t transition-all`}>
            <div className="space-y-2">
              <Label>Redis Endpoint URL</Label>
              <Input
                placeholder="https://..."
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
                  storeSettings?.isRedisConfigured
                    ? "•••••••• (Set successfully)"
                    : "Enter Redis Token"
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" /> Media Storage Provider
              </CardTitle>
              <CardDescription>
                Choose where to store uploaded images and videos.
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                storageProvider === "cloudinary"
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleSaveProviderSelection("cloudinary")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Cloudinary</span>
                </div>
                {storageProvider === "cloudinary" && (
                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Best for automated image optimization and CDN delivery. Standard
                choice.
              </p>
              {renderProviderUsage(storageUsage?.cloudinary)}
            </div>

            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                storageProvider === "r2"
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleSaveProviderSelection("r2")}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Cloudflare R2</span>
                </div>
                {storageProvider === "r2" && (
                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                S3-compatible, zero egress fees. Best for large video hosting or
                high volume.
              </p>
              {renderProviderUsage(storageUsage?.r2)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cloudinary Configuration */}
      <Card
        className={storageProvider === "cloudinary" ? "border-primary/50" : ""}
      >
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Cloudinary Configuration
              </CardTitle>
              {storeSettings?.isCloudinaryConfigured && (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
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
                <Pencil className="w-4 h-4 mr-2" /> Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingCloudinary(false)}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveCloudinary}
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
                placeholder="dvx..."
                value={cloudinaryCloudName}
                onChange={(e) => setCloudinaryCloudName(e.target.value)}
                disabled={!isEditingCloudinary}
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                placeholder="1234..."
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
                  storeSettings?.isCloudinaryConfigured
                    ? "•••••••• (Set successfully)"
                    : "Enter API Secret"
                }
                value={cloudinaryApiSecret}
                onChange={(e) => setCloudinaryApiSecret(e.target.value)}
                disabled={!isEditingCloudinary}
              />
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
                Used only if Cloudinary does not return a quota limit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* R2 Configuration */}
      <Card className={storageProvider === "r2" ? "border-primary/50" : ""}>
        <CardHeader className="flex flex-col gap-4 space-y-0 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                Cloudflare R2 Configuration
              </CardTitle>
              {storeSettings?.isR2Configured && (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
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
                <Pencil className="w-4 h-4 mr-2" /> Edit Config
              </Button>
            ) : (
              <SettingsActions>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingR2(false)}
                  className="w-full md:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveR2}
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
                  storeSettings?.isR2Configured
                    ? "•••••••• (Set successfully)"
                    : "Enter Secret Key"
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
              <Label>Public Domain URL (CDN)</Label>
              <Input
                value={r2PublicUrl}
                onChange={(e) => setR2PublicUrl(e.target.value)}
                placeholder="https://pub-xxxx.r2.dev"
                disabled={!isEditingR2}
              />
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
                R2 is usage-based, so this limit is set by you for tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
