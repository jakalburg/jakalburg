"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function NotificationsContent() {
  return (
    <SettingsPageShell
      title="Alert Settings"
      description="Configure notification and alert preferences."
    >
      <NotificationsTab />
    </SettingsPageShell>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
