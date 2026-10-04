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
  useEmailSettings,
  useUpdateEmailSettings,
  useVerifySmtp,
} from "@/hooks/use-email-settings";
import { toast } from "sonner";
import { Pencil, Check, Loader2, Mail } from "lucide-react";
import { SettingsActions } from "./settings-layout";

export function EmailTab() {
  // REAL backend (server EmailSettings singleton), not the mock settings blob.
  const { data: storeSettings, isLoading } = useEmailSettings();
  const updateStoreMutation = useUpdateEmailSettings();
  const verifySmtp = useVerifySmtp();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isEditingSmtp, setIsEditingSmtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (storeSettings) {
      setSmtpHost(storeSettings.smtpHost || "");
      setSmtpPort(storeSettings.smtpPort || 587);
      setSmtpSecure(storeSettings.smtpSecure ?? false);
      setSmtpUser(storeSettings.smtpUser || "");
      setSmtpPassword("");
      setSmtpFromEmail(storeSettings.smtpFromEmail || "");
      setSmtpFromName(storeSettings.smtpFromName || "");
      setOwnerEmail(storeSettings.ownerEmail || "");
      setIsEditingSmtp(false);
    }
  }, [storeSettings]);

  const handleCancel = () => {
    setIsEditingSmtp(false);
    if (storeSettings) {
      setSmtpHost(storeSettings.smtpHost || "");
      setSmtpPort(storeSettings.smtpPort || 587);
      setSmtpSecure(storeSettings.smtpSecure ?? false);
      setSmtpUser(storeSettings.smtpUser || "");
      setSmtpPassword("");
      setSmtpFromEmail(storeSettings.smtpFromEmail || "");
      setSmtpFromName(storeSettings.smtpFromName || "");
      setOwnerEmail(storeSettings.ownerEmail || "");
    }
  };

  const handleSaveEmail = () => {
    updateStoreMutation.mutate(
      {
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpSecure,
        smtpUser,
        smtpFromEmail,
        smtpFromName,
        ownerEmail,
        // Blank means "keep the stored password" — never send an empty string.
        ...(smtpPassword ? { smtpPassword } : {}),
      },
      {
        onSuccess: () => {
          setIsEditingSmtp(false);
          setSmtpPassword("");
          toast.success("Email configuration saved.");
        },
        onError: () => toast.error("Failed to save email configuration."),
      },
    );
  };

  const handleVerifySmtp = async () => {
    setIsVerifying(true);
    try {
      const result = await verifySmtp.mutateAsync();
      if (result.success) toast.success(result.message);
      else toast.error(result.message || "Failed to verify SMTP credentials.");
    } catch {
      toast.error("Could not reach server to verify SMTP connection.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">SMTP Configuration</CardTitle>
            {storeSettings?.isSmtpConfigured && (
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                <Check className="h-3 w-3" /> Configured
              </div>
            )}
          </div>
          <CardDescription>
            Configure your email delivery service (e.g., Gmail, Hostinger).
          </CardDescription>
        </div>
        <SettingsActions>
          {!isEditingSmtp && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerifySmtp}
              disabled={isVerifying || !storeSettings?.isSmtpConfigured}
              title="Test Connection"
              className="w-full md:mr-2 md:w-auto"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Verify Connection
            </Button>
          )}

          {!isEditingSmtp ? (
            <Button
              variant="outline"
              onClick={() => setIsEditingSmtp(true)}
              className="w-full md:w-auto"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Config
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full md:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEmail}
                disabled={updateStoreMutation.isPending}
                className="w-full md:w-auto"
              >
                Save Configuration
              </Button>
            </>
          )}
        </SettingsActions>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SMTP Host</Label>
            <Input
              placeholder="e.g. smtp.gmail.com"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              disabled={!isEditingSmtp}
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Port</Label>
            <Input
              type="number"
              placeholder="e.g. 587 or 465"
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
              disabled={!isEditingSmtp}
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Username (Email)</Label>
            <Input
              placeholder="e.g. contact@store.com"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              disabled={!isEditingSmtp}
            />
          </div>
          <div className="space-y-2">
            <Label>SMTP Password (or App Password)</Label>
            <Input
              type="password"
              placeholder={
                storeSettings?.isSmtpConfigured
                  ? "•••••••• (Set successfully)"
                  : "Enter password"
              }
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              disabled={!isEditingSmtp}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current password.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Sender Email (From address)</Label>
            <Input
              placeholder="e.g. noreply@store.com"
              value={smtpFromEmail}
              onChange={(e) => setSmtpFromEmail(e.target.value)}
              disabled={!isEditingSmtp}
            />
          </div>
          <div className="space-y-2">
            <Label>Sender Name (From name)</Label>
            <Input
              placeholder="e.g. Your Store Name"
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
              disabled={!isEditingSmtp}
            />
          </div>
          <div className="space-y-2 flex items-center pt-8 space-x-2">
            <Switch
              id="smtp-secure"
              checked={smtpSecure}
              onCheckedChange={setSmtpSecure}
              disabled={!isEditingSmtp}
            />
            <Label htmlFor="smtp-secure">
              Use Secure Connection (True for port 465)
            </Label>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <div>
            <h3 className="font-medium">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Who hears about store activity.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner Email (new-order alerts)</Label>
              <Input
                type="email"
                placeholder="e.g. orders@store.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                disabled={!isEditingSmtp}
              />
              <p className="text-xs text-muted-foreground">
                Where new-order notifications are delivered. Must be a real,
                reachable mailbox.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
