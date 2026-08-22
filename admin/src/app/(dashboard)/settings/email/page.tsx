"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EmailTab } from "@/components/settings/EmailTab";
import { SettingsPageShell } from "@/components/settings/settings-layout";

function EmailContent() {
  return (
    <SettingsPageShell
      title="Email Settings"
      description="Configure email templates and preferences."
    >
      <EmailTab />
    </SettingsPageShell>
  );
}

export default function EmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <EmailContent />
    </Suspense>
  );
}
