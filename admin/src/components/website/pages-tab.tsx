"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagesTable } from "@/components/pages/pages-table";
import { usePages } from "@/hooks/use-pages";
import { TableSkeleton } from "@/components/admin/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { pagesService } from "@/services/pages.service";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function PagesTab() {
  const { data: pages = [], isLoading } = usePages();
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => pagesService(api).seed(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success(data?.message || "Default pages seeded!");
    },
    onError: () => {
      toast.error("Failed to seed default pages");
    },
  });

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
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <TableSkeleton rows={5} columns={5} />
            </CardContent>
          </Card>
        ) : (
          <PagesTable pages={pages} />
        )}
      </div>
    </div>
  );
}
