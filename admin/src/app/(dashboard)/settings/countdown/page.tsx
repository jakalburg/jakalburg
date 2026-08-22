"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WebsiteCountdownTab } from "@/components/settings/WebsiteCountdownTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function CountdownContent() {
  return (
    <SettingsPageShell
      title="Countdown Settings"
      description="Configure the launch countdown gate shown on the storefront."
    >
      <WebsiteCountdownTab />
    </SettingsPageShell>
  );
}

export default function CountdownPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CountdownContent />
    </Suspense>
  );
}
