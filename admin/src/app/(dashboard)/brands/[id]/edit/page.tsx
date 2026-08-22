"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { brandsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { Brand } from "@/services/brands.service";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/products/image-upload";

const brandFormSchema = z.object({
  name: z.string().min(1, "Brand name is required"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  description: z.string().optional(),
  image: z.array(z.any()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type BrandFormValues = z.infer<typeof brandFormSchema>;

export default function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const axiosAuth = useAxiosAuth();

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", resolvedParams.id],
    queryFn: () => brandsService(axiosAuth).getById(resolvedParams.id),
    enabled: resolvedParams.id !== "undefined",
  });

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: {
      name: "",
      website: "",
      description: "",
      image: [],
      status: "active",
    },
  });

  useEffect(() => {
    if (brand) {
      form.reset({
        name: brand.name,
        website: brand.website || "",
        description: brand.description || "",
        status: (brand.status as "active" | "inactive") || "active",
        image: brand.logo
          ? [
              {
                id: "existing",
                url: brand.logo,
                isPrimary: true,
              },
            ]
          : [],
      });
    }
  }, [brand, form]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Brand>) =>
      brandsService(axiosAuth).update(resolvedParams.id, data),
    onSuccess: () => {
      toast.success("Brand updated successfully");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand", resolvedParams.id] });
      router.push("/catalog/brands");
    },
    onError: (error: any) => {
      toast.error("Failed to update brand", {
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: BrandFormValues) => {
    setIsSubmitting(true);
    try {
      // Note: Full image update logic for edit is not yet implemented in backend service update method for simplicity
      // For now we update text fields. If file upload needed for edit, update service.
      // But typically we'd separate image update or handle it similarly to create.

      const brandData = {
        name: data.name,
        website: data.website || undefined,
        description: data.description || undefined,
        status: data.status,
      };

      await updateMutation.mutateAsync(brandData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog/brands">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Brand</h1>
          <p className="text-muted-foreground mt-1">Update brand details</p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Nike, Adidas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (About Brand)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Information about this brand"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note: Image upload on edit is read-only visualization for now unless backend supports it */}
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Logo</FormLabel>
                    <div className="text-xs text-muted-foreground mb-2">
                      (Image updates not fully supported in edit mode yet)
                    </div>
                    <FormControl>
                      <ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                        maxImages={1}
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
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
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
              {isSubmitting ? "Updating..." : "Update Brand"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/catalog/brands">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
