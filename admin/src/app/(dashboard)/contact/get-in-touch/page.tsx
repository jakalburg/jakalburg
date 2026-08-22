"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ContactTab } from "@/components/contact/contact-tab";

function GetInTouchContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Get In Touch</h1>
        <p className="text-muted-foreground mt-1">
          Manage get in touch form submissions
        </p>
      </div>

      <ContactTab type="get_in_touch" />
    </div>
  );
}

export default function GetInTouchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GetInTouchContent />
    </Suspense>
  );
}
