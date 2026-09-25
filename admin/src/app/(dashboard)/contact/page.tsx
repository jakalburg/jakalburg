"use client";

import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, Users2 } from "lucide-react";
import { ContactTab } from "@/components/contact/contact-tab";

// Contact inbox: storefront contact-form submissions and newsletter signups,
// each surfaced through <ContactTab /> (wired to the real backend). "Get In
// Touch" was removed — the storefront has no such form.
function ContactContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Inbox</h1>
        <p className="text-muted-foreground mt-2">
          View and manage customer inquiries and newsletter signups.
        </p>
      </div>

      <Tabs defaultValue="contact_us">
        <TabsList className="grid w-full grid-cols-2 max-w-[360px]">
          <TabsTrigger value="contact_us" className="gap-2">
            <Mail className="h-4 w-4" />
            Contact Us
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="gap-2">
            <Users2 className="h-4 w-4" />
            Newsletter
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="contact_us" className="mt-0">
            <ContactTab type="contact_us" />
          </TabsContent>
          <TabsContent value="newsletter" className="mt-0">
            <ContactTab type="newsletter" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <ContactContent />
    </Suspense>
  );
}
