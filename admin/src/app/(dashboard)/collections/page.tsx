"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { Badge } from "@/components/ui/badge";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CollectionsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const {
    data: collections = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionsService(api).getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => collectionsService(api).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete collection");
    },
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      header: "Image",
      className: "w-[80px]",
      cell: (collection: any) => (
        <ImageShimmer
          src={collection.image}
          alt={collection.name}
          wrapperClassName="w-12 h-12 rounded-md border border-input"
        />
      ),
    },
    {
      header: "Name",
      cell: (collection: any) => (
        <div className="font-medium">{collection.name}</div>
      ),
    },
    {
      header: "Products",
      cell: (collection: any) => (
        <span className="text-sm text-muted-foreground">
          {collection._count?.products ?? 0}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (collection: any) => (
        <Badge
          variant={collection.status === "active" ? "default" : "secondary"}
        >
          {collection.status || "active"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-[150px]",
      cell: (collection: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/collections/${collection.id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === collection.id}
              >
                {deletingId === collection.id ? (
                  "Deleting..."
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  the collection &quot;{collection.name}&quot; and remove it
                  from associated products.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(collection.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
          <p className="text-muted-foreground mt-1">
            Manage the collections shoppers browse by on the homepage &quot;Shop
            By Collection&quot; section
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/collections/new">
            <Plus className="w-4 h-4" />
            Add Collection
          </Link>
        </Button>
      </div>

      {/* Collections Table */}
      <DataTable
        title="All Collections"
        data={collections}
        columns={columns}
        isLoading={isLoading}
        error={error}
        emptyMessage="No collections found"
        getRowKey={(collection) => collection.id}
      />
    </div>
  );
}
