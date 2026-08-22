"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

import { categoriesService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useAdminQuery } from "@/hooks/use-admin-query";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/ui/loader";
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

import { useCategories } from "@/hooks/use-categories";

const categoryFormSchema = z.object({
  parent: z.string().min(1, "Category name is required"),
  parentId: z.string().optional().nullable(),
  productType: z.string().optional(),
  description: z.string().optional(),
  img: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function EditCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { id } = useParams() as { id: string };
  const api = useAxiosAuth();

  // Fetch category by ID
  const { data: category, isLoading } = useAdminQuery(["category", id], () =>
    categoriesService(api).getById(id),
  );

  // Fetch all categories for parent selection
  const { data: categories } = useCategories();
  const mainCategories =
    categories?.filter((c: any) => !c.parentId && c.id !== id) || [];

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      parent: "",
      parentId: null,
      productType: "",
      description: "",
      img: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        parent: (category.parent || "").replace(/^( - |- )/, ""),
        parentId: category.parentId || null,
        productType: category.productType || "",
        description: category.description || "",
        img: category.img || "",
        status: (category.status as "active" | "inactive") || "active",
      });
    }
  }, [category, form]);

  const updateMutation = useMutation({
    mutationFn: (data: CategoryFormValues) =>
      categoriesService(api).update(id, data),
    onSuccess: () => {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", id] });
      router.push("/catalog/categories");
    },
    onError: (error: any) => {
      toast.error("Failed to update category", {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => categoriesService(api).delete(id),
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      router.push("/catalog/categories");
    },
    onError: (error: any) => {
      toast.error("Failed to delete category", {
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      // If parentId is set, ensure we strip any potential prefix from name just in case
      // taking raw name input as is.
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync();
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/catalog/categories">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
            <p className="text-muted-foreground mt-1">
              Update category information
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                category and may affect associated products.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Category Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The main name of the category
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "root" ? null : value)
                      }
                      value={field.value || "root"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="root">
                          None (Root Category)
                        </SelectItem>
                        {mainCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.parent}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a parent category if this is a subcategory.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Physical, Digital" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional product type classification
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this category..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="img"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/image.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional category image URL
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/catalog/categories">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
