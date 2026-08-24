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
import type { UpdateCollectionDto } from "@/services/collections.service";
import { uploadProductImages } from "@/services/uploads.service";

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
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/products/image-upload";

const collectionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.array(z.any()).optional(),
  enabled: z.boolean(),
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
      title: "",
      subtitle: "",
      description: "",
      image: [],
      enabled: true,
    },
  });

  useEffect(() => {
    if (collection) {
      form.reset({
        title: collection.title,
        subtitle: collection.subtitle || "",
        description: collection.description || "",
        enabled: collection.enabled,
        image: collection.image
          ? [{ id: "existing", url: collection.image, isPrimary: true }]
          : [],
      });
    }
  }, [collection, form]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCollectionDto) =>
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
      const msg =
        error?.response?.data?.message ?? error?.message ?? "Something went wrong";
      toast.error("Failed to update collection", {
        description: Array.isArray(msg) ? msg.join(", ") : String(msg),
      });
    },
  });

  const onSubmit = async (data: CollectionFormValues) => {
    setIsSubmitting(true);
    try {
      // Resolve the cover image: upload a freshly-picked file, keep an existing
      // hosted URL, or clear it (empty string) when the user removed it.
      let imageValue: string | undefined = undefined;
      const picked = data.image?.[0];
      if (picked?.file) {
        const result = await uploadProductImages([picked.file]);
        if (result.uploaded.length > 0) {
          imageValue = result.uploaded[0].url;
        } else {
          toast.error("Image upload failed", {
            description: result.failed.map((f) => f.fileName).join(", "),
          });
          return;
        }
      } else if (typeof picked?.url === "string" && /^https?:\/\//.test(picked.url)) {
        imageValue = picked.url;
      } else {
        // No image in the field — explicitly clear it on the server.
        imageValue = "";
      }

      await updateMutation.mutateAsync({
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || "",
        description: data.description?.trim() || "",
        image: imageValue,
        enabled: data.enabled,
      });
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Collection</h1>
          <p className="text-muted-foreground mt-1">Update collection details</p>
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Essentials" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lightweight layers" {...field} />
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
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Longer copy shown on the collection page."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover image</FormLabel>
                    <FormControl>
                      <ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                        maxImages={1}
                        showPrimary={false}
                        replaceWhenFull
                        inputId="collection-image-upload"
                      />
                    </FormControl>
                    <FormDescription>
                      A newly-picked image is uploaded to Cloudinary on save.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Off = hidden from the storefront.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
