"use client";

import Link from "next/link";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/admin/data-table";
import { useCategories, useDeleteCategory } from "@/hooks/use-categories";
import { Badge } from "@/components/ui/badge";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useState } from "react";
import { cn } from "@/lib/utils";
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

export function CategoriesTab() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  const { data: categories = [], isLoading, error } = useCategories();
  const deleteMutation = useDeleteCategory();

  // Create a hierarchical structure for the table
  const tableData = (() => {
    if (!categories) return [];

    const hierarchy: any[] = [];
    const mainCategories = categories.filter((c: any) => !c.parentId); // Roots
    const subCategories = categories.filter((c: any) => c.parentId); // Children

    // Sort main categories alphabetically
    mainCategories.sort((a: any, b: any) => a.parent.localeCompare(b.parent));

    mainCategories.forEach((main: any) => {
      // Add main category
      hierarchy.push({ ...main, isMain: true });

      // If expanded, add subcategories
      if (expandedCategories[main.id]) {
        const subs = subCategories.filter(
          (sub: any) => sub.parentId === main.id,
        );

        // Sort subcategories alphabetically
        subs.sort((a: any, b: any) => a.parent.localeCompare(b.parent));

        subs.forEach((sub: any) => {
          hierarchy.push({ ...sub, isMain: false, mainParentId: main.id });
        });
      }
    });

    return hierarchy;
  })();

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getSubcategoryCount = (categoryId: string) => {
    return categories.filter((cat: any) => cat.parentId === categoryId).length;
  };

  const handleDelete = async (id: string, isMain: boolean) => {
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
      cell: (category: any) => (
        <ImageShimmer
          src={category.img}
          alt={category.parent}
          wrapperClassName={cn(
            "w-12 h-12 rounded-md",
            !category.isMain && "ml-8",
          )}
        />
      ),
    },
    {
      header: "Name",
      cell: (category: any) => {
        if (category.isMain) {
          const count = getSubcategoryCount(category.id);
          const isExpanded = expandedCategories[category.id];

          return (
            <div className="flex items-center gap-2">
              {count > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpand(category.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              <span className="font-medium">
                {category.parent.replace(/^( - |- )/, "")}
              </span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-2 ml-8">
              <span>{category.parent.replace(/^( - |- )/, "")}</span>
            </div>
          );
        }
      },
    },
    {
      header: "Product Type",
      cell: (category: any) =>
        category.productType ? (
          <Badge variant="outline">{category.productType}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      header: "Subcategories",
      className: "w-[120px]",
      cell: (category: any) => {
        if (!category.isMain) {
          return <span className="text-muted-foreground">-</span>;
        }
        const count = getSubcategoryCount(category.id);
        return (
          <Badge variant={count > 0 ? "secondary" : "outline"}>
            {count} {count === 1 ? "sub" : "subs"}
          </Badge>
        );
      },
    },
    {
      header: "Status",
      cell: (category: any) => (
        <Badge variant={category.status === "active" ? "default" : "secondary"}>
          {category.status || "active"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      className: "w-[150px]",
      cell: (category: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/categories/${category.id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === category.id}
              >
                {deletingId === category.id ? (
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
                  category "{category.parent}" and may affect associated
                  products.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(category.id, category.isMain)}
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
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground mt-1">
            Manage product categories and classifications
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/categories/new">
            <Plus className="w-4 h-4" />
            Add Category
          </Link>
        </Button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg overflow-x-auto">
        <DataTable
          title="All Categories"
          data={tableData}
          columns={columns}
          isLoading={isLoading}
          error={error}
          emptyMessage="No categories found"
          getRowKey={(category) => category.id}
        />
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading categories...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error loading categories
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No categories found
          </div>
        ) : (
          tableData.map((category: any) => {
            const count = getSubcategoryCount(category.id);
            const isExpanded = expandedCategories[category.id];

            return (
              <div
                key={category.id}
                className={cn(
                  "border rounded-lg p-4 bg-card",
                  !category.isMain && "ml-6 border-dashed",
                )}
              >
                <div className="flex gap-3 mb-3">
                  <ImageShimmer
                    src={category.img}
                    alt={category.parent}
                    wrapperClassName="w-12 h-12 rounded-md flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {category.isMain && count > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 p-0 -ml-1 shrink-0"
                          onClick={() => toggleExpand(category.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <h3 className="font-medium text-sm truncate">
                        {category.parent.replace(/^( - |- )/, "")}
                      </h3>
                    </div>
                    {category.productType && (
                      <Badge variant="outline" className="mt-1">
                        {category.productType}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={
                      category.status === "active" ? "default" : "secondary"
                    }
                    className="h-fit shrink-0 rounded-lg"
                  >
                    {category.status || "active"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  {category.isMain ? (
                    <Badge variant={count > 0 ? "secondary" : "outline"}>
                      {count} {count === 1 ? "sub" : "subs"}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      asChild
                    >
                      <Link href={`/categories/${category.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-destructive hover:text-destructive"
                          disabled={deletingId === category.id}
                        >
                          {deletingId === category.id ? (
                            "..."
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the category &quot;{category.parent}&quot;
                            and may affect associated products.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleDelete(category.id, category.isMain)
                            }
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
