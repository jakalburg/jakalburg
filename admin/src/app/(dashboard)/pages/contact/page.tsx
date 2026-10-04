"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactPageForm } from "@/components/pages/contact-page-form";

/**
 * Contact page editor, listed with the rest of the storefront's page content
 * under Website → Static Pages. A static segment, so it takes precedence over
 * the sibling `[id]` route — "contact" is not a Page id.
 */
function ContactPageContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/website/pages">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pages
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Page</h1>
          <p className="text-muted-foreground mt-1">
            The heading, supporting copy and banner shown beside the contact
            form on the storefront.
          </p>
        </div>
      </div>

      <ContactPageForm />
    </div>
  );
}

export default function AdminContactPage() {
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
