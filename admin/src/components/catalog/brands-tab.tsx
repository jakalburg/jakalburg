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
import { cn } from "@/lib/utils";
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

export function BrandsTab() {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Brands</h2>
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

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
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

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading brands...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading brands
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No brands found
          </div>
        ) : (
          brands.map((brand: any) => (
            <div
              key={brand.id}
              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex gap-3 mb-3">
                {/* Logo */}
                <ImageShimmer
                  src={brand.logo}
                  alt={brand.name}
                  wrapperClassName="w-12 h-12 rounded-md flex-shrink-0 border border-input"
                  className="p-1"
                  objectFit="contain"
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{brand.name}</h3>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs mt-1 block break-all"
                      title={brand.website}
                    >
                      {brand.website}
                    </a>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        brand.status === "active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {brand.status || "active"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  asChild
                >
                  <Link href={`/brands/${brand.id}/edit`}>Edit</Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-destructive hover:text-destructive/90"
                      disabled={deletingId === brand.id}
                    >
                      {deletingId === brand.id ? "Deleting..." : "Delete"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the brand "{brand.name}" and remove it from
                        associated products.
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
