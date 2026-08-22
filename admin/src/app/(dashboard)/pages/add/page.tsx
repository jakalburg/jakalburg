"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageForm from "@/components/pages/page-form";
import { Button } from "@/components/ui/button";

export default function CreatePagePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/website/pages">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Page</h1>
          <p className="text-muted-foreground mt-1">
            Add a new static page
          </p>
        </div>
      </div>

      <PageForm />
    </div>
  );
}
