"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { categoriesService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { Category } from "@/services/categories.service";
import { useCategories } from "@/hooks/use-categories";

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
import { ImageUpload } from "@/components/products/image-upload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const categoryFormSchema = z.object({
  categoryType: z.enum(["main", "subcategory"]),
  parentCategory: z.string().optional(), // Now stores ID
  categoryName: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  image: z.array(z.any()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CreateCategoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categories } = useCategories();

  // Get main categories (roots only)
  // Assuming API returns flat list with parentId
  // We filter by checking if parentId is missing OR check legacy " - " absence?
  // New backend syncs roots to have parentId=null.
  // Legacy roots also have parentId=null.
  const mainCategories =
    categories?.filter(
      (cat: Category) => !cat.parentId && !cat.parent.includes(" - "),
    ) || [];

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      categoryType: "main",
      parentCategory: "",
      categoryName: "",
      description: "",
      image: [],
      status: "active",
    },
  });

  const categoryType = form.watch("categoryType");
  const parentCategoryId = form.watch("parentCategory");

  // Reset parent category when type changes to main
  useEffect(() => {
    if (categoryType === "main") {
      form.setValue("parentCategory", "");
    }
  }, [categoryType, form]);

  const axiosAuth = useAxiosAuth();

  // Updated mutation signature to accept parentId
  const createMutation = useMutation({
    mutationFn: (
      data: Partial<Category> & { file?: File; parentId?: string },
    ) => categoriesService(axiosAuth).createWithMedia(data),
    onSuccess: () => {
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      router.push("/catalog/categories");
    },
    onError: (error: any) => {
      toast.error("Failed to create category", {
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    try {
      const file =
        data.image && data.image.length > 0 ? data.image[0].file : undefined;

      // Find parent name for productType (if subcategory)
      let productType = "";
      if (data.categoryType === "main") {
        productType = data.categoryName;
      } else if (data.parentCategory) {
        const parentCat = mainCategories.find(
          (c: Category) => c.id === data.parentCategory,
        );
        productType = parentCat ? parentCat.parent : "";
      }

      const categoryData = {
        parent: data.categoryName, // Send RAW name (no prefix)
        parentId:
          data.categoryType === "subcategory" ? data.parentCategory : undefined,
        productType: productType,
        description: data.description,
        status: data.status,
        file,
      };

      await createMutation.mutateAsync(categoryData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog/categories">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Category</h1>
          <p className="text-muted-foreground mt-1">
            Add a new product category
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="categoryType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Category Type *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="main" id="main" />
                          <Label
                            htmlFor="main"
                            className="font-normal cursor-pointer"
                          >
                            Main Category
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="subcategory"
                            id="subcategory"
                          />
                          <Label
                            htmlFor="subcategory"
                            className="font-normal cursor-pointer"
                          >
                            Subcategory
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Choose whether this is a main category or a subcategory
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {categoryType === "subcategory" && (
                <FormField
                  control={form.control}
                  name="parentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mainCategories.map((cat: Category) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.parent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the main category this subcategory belongs to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="categoryName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {categoryType === "main"
                        ? "Category Name *"
                        : "Subcategory Name *"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          categoryType === "main"
                            ? "e.g., Necklaces, Earrings"
                            : "e.g., Gold, Silver, Diamond"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {categoryType === "main"
                        ? "The main category name (must be unique)"
                        : "Name of the subcategory"}
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
                        placeholder="Add a description..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="active" id="active" />
                          <Label htmlFor="active">Active</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="inactive" id="inactive" />
                          <Label htmlFor="inactive">Inactive</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Image</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/catalog/categories")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create Category
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
