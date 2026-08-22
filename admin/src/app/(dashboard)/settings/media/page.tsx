"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { StorageTab } from "@/components/settings/StorageTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function MediaContent() {
  return (
    <SettingsPageShell
      title="Storage Settings"
      description="Manage media storage and file uploads."
    >
      <StorageTab />
    </SettingsPageShell>
  );
}

export default function MediaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MediaContent />
    </Suspense>
  );
}
