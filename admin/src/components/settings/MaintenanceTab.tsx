"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Save,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  useMaintenanceSettings,
  useUpdateMaintenance,
  useRegeneratePreviewToken,
  useRevokePreviewToken,
} from "@/hooks/use-maintenance";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { SettingsActions } from "./settings-layout";

const DEFAULT_TITLE = "We’ll be back shortly";
const DEFAULT_MESSAGE =
  "The shop is closed for scheduled maintenance. Thanks for your patience — please check back soon.";

const STOREFRONT_URL =
  process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";

const TIME_ZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  dateValue: string,
  timeValue: string,
  timeZone: string,
) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(firstPass, timeZone);
  return new Date(utcGuess.getTime() - correctedOffset);
}

function splitTargetForTimezone(
  targetAt: string | Date | null | undefined,
  timeZone: string,
) {
  if (!targetAt) return { date: "", time: "" };
  const date = new Date(targetAt);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function MaintenancePreview({
  title,
  message,
  targetAt,
  storeName,
  logo,
}: {
  title: string;
  message: string;
  targetAt: Date | null;
  storeName: string;
  logo?: string | null;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, (targetAt?.getTime() ?? now) - now);
  const units: [string, number][] = [
    ["Days", Math.floor(remaining / 86400000)],
    ["Hours", Math.floor((remaining % 86400000) / 3600000)],
    ["Minutes", Math.floor((remaining % 3600000) / 60000)],
    ["Seconds", Math.floor((remaining % 60000) / 1000)],
  ];

  return (
    <div className="rounded-lg border bg-[#f8f3ee] p-6 text-center text-[#2d2520]">
      <Badge className="mb-4">Preview</Badge>
      {/* Same rule as the real page: the uploaded mark when there is one,
          otherwise the store name as a wordmark — so the preview shows what
          visitors would actually see, not a flattering version of it. */}
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={storeName}
          className="mx-auto h-8 w-auto object-contain"
        />
      ) : (
        <div className="text-sm font-semibold uppercase tracking-[0.18em]">
          {storeName}
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6f625a]">{message}</p>
      {targetAt && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {units.map(([label, value]) => (
            <div key={label} className="rounded-md border bg-white/80 p-3">
              <div className="text-2xl font-semibold tabular-nums">
                {String(value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-[#7d7068]">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MaintenanceTab() {
  const { data: settings, isLoading } = useMaintenanceSettings();
  const { data: store } = useStoreSettings();
  const updateMaintenance = useUpdateMaintenance();
  const regenerateToken = useRegeneratePreviewToken();
  const revokeToken = useRevokePreviewToken();

  const [active, setActive] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [previewOpen, setPreviewOpen] = useState(false);

  /** Plaintext token, held in memory only while the dialog is open. */
  const [issuedToken, setIssuedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const nextTimeZone = settings.timezone || "Asia/Kolkata";
    setActive(Boolean(settings.active));
    setTitle(settings.title || DEFAULT_TITLE);
    setMessage(settings.message || DEFAULT_MESSAGE);
    setTimeZone(nextTimeZone);
    const split = splitTargetForTimezone(settings.endsAt, nextTimeZone);
    setDateValue(split.date);
    setTimeValue(split.time);
  }, [settings]);

  const endsAt = useMemo(() => {
    if (!dateValue || !timeValue || !timeZone) return null;
    try {
      return zonedDateTimeToUtc(dateValue, timeValue, timeZone);
    } catch {
      return null;
    }
  }, [dateValue, timeValue, timeZone]);

  const handleSave = () => {
    // The target time is presentational, so an empty or past one is allowed —
    // it just means no countdown is shown. Maintenance never lifts on a clock.
    updateMaintenance.mutate(
      {
        active,
        title: title || DEFAULT_TITLE,
        message: message || DEFAULT_MESSAGE,
        endsAt: endsAt ? endsAt.toISOString() : null,
        timezone: timeZone,
      },
      {
        onSuccess: () =>
          toast.success(
            active
              ? "Maintenance mode is ON — the storefront is closed."
              : "Maintenance mode is OFF — the storefront is live.",
          ),
      },
    );
  };

  const handleRegenerate = async () => {
    try {
      const { token } = await regenerateToken.mutateAsync();
      setIssuedToken(token);
    } catch {
      toast.error("Could not generate a preview token.");
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeToken.mutateAsync();
      toast.success("Preview token revoked. Existing links no longer work.");
    } catch {
      toast.error("Could not revoke the preview token.");
    }
  };

  const previewUrl = issuedToken
    ? `${STOREFRONT_URL.replace(/\/+$/, "")}/?preview=${issuedToken}`
    : "";

  const copyPreviewUrl = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      toast.success("Preview link copied.");
    } catch {
      toast.error("Could not copy — select the link and copy it manually.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className={active ? "border-amber-300" : ""}>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Maintenance Mode
              {active && (
                <Badge variant="destructive" className="uppercase">
                  Storefront closed
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Closes the customer website and makes the API answer 503.
            </CardDescription>
          </div>
          <SettingsActions>
            <Button variant="outline" onClick={() => setPreviewOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={updateMaintenance.isPending}>
              {updateMaintenance.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </SettingsActions>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Enable maintenance mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Customers see the message below. Nothing can be browsed or
                    ordered until you turn this off.
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>

              {active && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    This admin keeps working while maintenance is on — that is
                    how you switch it back off. Customer sign-in, browsing,
                    carts and checkout are all refused.
                  </span>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Heading</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[90px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected back — date</Label>
                  <Input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expected back — time</Label>
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Time zone</Label>
                  <Select value={timeZone} onValueChange={setTimeZone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_ZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {zone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Shown to customers as a countdown. It never ends maintenance
                    on its own — only this screen does.
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Preview access
          </CardTitle>
          <CardDescription>
            A secret link that lets you — and only you — browse the live site
            while maintenance is on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The link carries a 256-bit token. The server stores only its hash
            and checks it on every single request, so the bypass cannot be
            faked by editing a cookie — without the real token a visitor gets
            the maintenance page like everyone else.{" "}
            {settings?.hasPreviewToken
              ? "A token is currently active."
              : "No token has been generated yet."}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerateToken.isPending}
            >
              {regenerateToken.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              {settings?.hasPreviewToken
                ? "Generate a new link"
                : "Generate preview link"}
            </Button>
            {settings?.hasPreviewToken && (
              <Button
                variant="ghost"
                onClick={handleRevoke}
                disabled={revokeToken.isPending}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Revoke
              </Button>
            )}
          </div>

          {settings?.hasPreviewToken && (
            <p className="text-xs text-muted-foreground">
              Generating a new link immediately invalidates the previous one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* The token is visible exactly once, here. */}
      <Dialog
        open={Boolean(issuedToken)}
        onOpenChange={(open) => !open && setIssuedToken(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Your preview link</DialogTitle>
            <DialogDescription>
              Copy it now — it is stored only as a hash and cannot be shown
              again. Generate a new one if you lose it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={previewUrl} className="font-mono text-xs" />
            <Button size="sm" onClick={copyPreviewUrl}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Opening it stores the token in that browser only. Treat it like a
            password — anyone with the link can see the site while it is closed.
          </p>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance page preview</DialogTitle>
            <DialogDescription>
              Uses the current unsaved form values. This does not publish
              anything.
            </DialogDescription>
          </DialogHeader>
          <MaintenancePreview
            title={title || DEFAULT_TITLE}
            message={message || DEFAULT_MESSAGE}
            targetAt={endsAt}
            // From Settings → Store rather than hardcoded, so the preview
            // follows the brand instead of drifting from it.
            storeName={store?.storeName?.trim() || "Jakalburg"}
            logo={store?.logo?.trim() || null}
          />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  );
}
