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

import { collectionsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { Collection } from "@/services/collections.service";

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

const collectionFormSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
  image: z.array(z.any()).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const axiosAuth = useAxiosAuth();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", resolvedParams.id],
    queryFn: () => collectionsService(axiosAuth).getById(resolvedParams.id),
    enabled: resolvedParams.id !== "undefined",
  });

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      image: [],
      status: "active",
    },
  });

  useEffect(() => {
    if (collection) {
      form.reset({
        name: collection.name,
        description: collection.description || "",
        status: (collection.status as "active" | "inactive") || "active",
        image: collection.image
          ? [
              {
                id: "existing",
                url: collection.image,
                isPrimary: true,
              },
            ]
          : [],
      });
    }
  }, [collection, form]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Collection>) =>
      collectionsService(axiosAuth).update(resolvedParams.id, data),
    onSuccess: () => {
      toast.success("Collection updated successfully");
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({
        queryKey: ["collection", resolvedParams.id],
      });
      router.push("/collections");
    },
    onError: (error: any) => {
      toast.error("Failed to update collection", {
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: CollectionFormValues) => {
    setIsSubmitting(true);
    try {
      const collectionData = {
        name: data.name,
        description: data.description || undefined,
        status: data.status,
      };

      await updateMutation.mutateAsync(collectionData);
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
          <Link href="/collections">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Edit Collection
          </h1>
          <p className="text-muted-foreground mt-1">
            Update collection details
          </p>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Once Upon A Time"
                        {...field}
                      />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Information about this collection"
                        {...field}
                      />
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
                    <FormLabel>Collection Image</FormLabel>
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
              {isSubmitting ? "Updating..." : "Update Collection"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/collections">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
