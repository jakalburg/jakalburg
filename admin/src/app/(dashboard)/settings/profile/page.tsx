"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function ProfileContent() {
  return (
    <SettingsPageShell
      title="Profile Settings"
      description="Manage your account profile information."
    >
      <ProfileTab />
    </SettingsPageShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
