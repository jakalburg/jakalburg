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
import { Eye, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { SettingsActions } from "./settings-layout";

const DEFAULT_TITLE = "We're launching something special";
const DEFAULT_MESSAGE =
  "Please stay tuned. The website will be available when the countdown ends.";

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

function zonedDateTimeToUtc(dateValue: string, timeValue: string, timeZone: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  const firstPass = new Date(utcGuess.getTime() - offset);
  const correctedOffset = getTimeZoneOffsetMs(firstPass, timeZone);
  return new Date(utcGuess.getTime() - correctedOffset);
}

function splitTargetForTimezone(targetAt: string | Date | null | undefined, timeZone: string) {
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

function CountdownPreview({
  title,
  message,
  targetAt,
  preview = false,
}: {
  title: string;
  message: string;
  targetAt: Date | null;
  preview?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const remaining = Math.max(0, (targetAt?.getTime() || now) - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const units = [
    ["Days", days],
    ["Hours", hours],
    ["Minutes", minutes],
    ["Seconds", seconds],
  ];

  return (
    <div className="rounded-lg border bg-[#f8f3ee] p-6 text-center text-[#2d2520]">
      {preview && <Badge className="mb-4">Preview</Badge>}
      <div className="text-sm font-semibold uppercase tracking-[0.18em]">
        KAY by Khushie
      </div>
      <h3 className="mt-3 text-2xl font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#6f625a]">{message}</p>
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
    </div>
  );
}

export function WebsiteCountdownTab() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [showCountdown, setShowCountdown] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const nextTimeZone = settings.countdownTimezone || "Asia/Kolkata";
    setShowCountdown(Boolean(settings.showCountdown));
    setTitle(settings.countdownTitle || DEFAULT_TITLE);
    setMessage(settings.countdownMessage || DEFAULT_MESSAGE);
    setTimeZone(nextTimeZone);
    const split = splitTargetForTimezone(settings.countdownTargetAt, nextTimeZone);
    setDateValue(split.date);
    setTimeValue(split.time);
  }, [settings]);

  const targetAt = useMemo(() => {
    if (!dateValue || !timeValue || !timeZone) return null;
    try {
      return zonedDateTimeToUtc(dateValue, timeValue, timeZone);
    } catch {
      return null;
    }
  }, [dateValue, timeValue, timeZone]);

  const validate = () => {
    if (!showCountdown) return true;
    if (!dateValue) return "Target date is required";
    if (!timeValue) return "Target time is required";
    if (!timeZone) return "Time zone is required";
    if (!targetAt || targetAt.getTime() <= Date.now()) {
      return "Countdown target must be in the future";
    }
    return true;
  };

  const handleSave = () => {
    const validation = validate();
    if (validation !== true) {
      toast.error(validation);
      return;
    }
    updateSettings.mutate({
      showCountdown,
      countdownTitle: title || DEFAULT_TITLE,
      countdownMessage: message || DEFAULT_MESSAGE,
      countdownTargetAt: targetAt ? targetAt.toISOString() : null,
      countdownTimezone: timeZone,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Website Countdown</CardTitle>
          <CardDescription>
            Show a full-screen launch countdown on the customer website.
          </CardDescription>
        </div>
        <SettingsActions>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Countdown
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
                <Label>Show Countdown</Label>
                <p className="text-sm text-muted-foreground">
                  Blocks the customer website until the target time.
                </p>
              </div>
              <Switch
                checked={showCountdown}
                onCheckedChange={setShowCountdown}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Countdown heading</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Optional short message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[90px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Target date</Label>
                <Input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Target time</Label>
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
              </div>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Website Countdown Preview</DialogTitle>
            <DialogDescription>
              Uses the current unsaved form values. This does not publish settings.
            </DialogDescription>
          </DialogHeader>
          <CountdownPreview
            preview
            title={title || DEFAULT_TITLE}
            message={message || DEFAULT_MESSAGE}
            targetAt={targetAt}
          />
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
