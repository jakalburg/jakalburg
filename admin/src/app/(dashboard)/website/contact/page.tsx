"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ContactTab } from "@/components/website/contact-tab";

function ContactPageContent() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Us Page</h1>
        <p className="text-muted-foreground mt-1">
          Configure the banner image and communication details for the Contact
          Us page.
        </p>
      </div>

      <ContactTab />
    </div>
  );
}

export default function WebsiteContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ContactPageContent />
    </Suspense>
  );
}
