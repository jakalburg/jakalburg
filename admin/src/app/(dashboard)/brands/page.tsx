"use client";

import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { brandsService } from "@/services";
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

export default function BrandsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const {
    data: brands = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsService(api).getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brandsService(api).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete brand");
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
      header: "Logo",
      className: "w-[80px]",
      cell: (brand: any) => (
        <ImageShimmer
          src={brand.logo}
          alt={brand.name}
          wrapperClassName="w-12 h-12 rounded-md border border-input"
          className="p-1"
          objectFit="contain"
        />
      ),
    },
    {
      header: "Name",
      cell: (brand: any) => <div className="font-medium">{brand.name}</div>,
    },
    {
      header: "Website",
      cell: (brand: any) =>
        brand.website ? (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            {brand.website}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: "Status",
      cell: (brand: any) => (
        <Badge variant={brand.status === "active" ? "default" : "secondary"}>
          {brand.status || "active"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-[150px]",
      cell: (brand: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/brands/${brand.id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === brand.id}
              >
                {deletingId === brand.id ? (
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
                  This action cannot be undone. This will permanently delete the
                  brand "{brand.name}" and remove it from associated products.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(brand.id)}
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
          <h1 className="text-3xl font-bold tracking-tight">Brands</h1>
          <p className="text-muted-foreground mt-1">
            Manage product brands and manufacturers
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/brands/new">
            <Plus className="w-4 h-4" />
            Add Brand
          </Link>
        </Button>
      </div>

      {/* Brands Table */}
      <DataTable
        title="All Brands"
        data={brands}
        columns={columns}
        isLoading={isLoading}
        error={error}
        emptyMessage="No brands found"
        getRowKey={(brand) => brand.id}
      />
    </div>
  );
}
