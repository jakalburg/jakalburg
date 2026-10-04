"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagesTable } from "@/components/pages/pages-table";
import { useSeedPages } from "@/hooks/use-pages";

export function PagesTab() {
  // The table owns its own paged query (and its loading state) — it has the
  // search and page state the request is built from.
  const seedMutation = useSeedPages();

  return (
    <div className="space-y-6 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Static Pages</h2>
          <p className="text-muted-foreground text-sm">
            Manage your dynamic site content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            <RefreshCw
              className={`w-4 h-4 ${seedMutation.isPending ? "animate-spin" : ""}`}
            />
            Seed defaults
          </Button>
          <Button asChild className="gap-2" size="sm">
            <Link href="/pages/add">
              <Plus className="w-4 h-4" />
              Add Page
            </Link>
          </Button>
        </div>
      </div>

      {/* Pages Table */}
      <div>
        <PagesTable />
      </div>
    </div>
  );
}
