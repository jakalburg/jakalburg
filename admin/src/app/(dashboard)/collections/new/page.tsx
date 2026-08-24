"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

import { collectionsService } from "@/services";
import useAxiosAuth from "@/hooks/use-axios-auth";
import type { CreateCollectionDto } from "@/services/collections.service";
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

// The "Shop by mood" collection form. Writes to the real NestJS backend via
// collectionsService (realApi). The cover image is uploaded to Cloudinary first
// (uploadProductImages → URL), then stored on the collection as a plain URL.
const collectionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  image: z.array(z.any()).optional(),
  enabled: z.boolean(),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

export default function CreateCollectionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const axiosAuth = useAxiosAuth();

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

  const createMutation = useMutation({
    mutationFn: (data: CreateCollectionDto) =>
      collectionsService(axiosAuth).create(data),
    onSuccess: () => {
      toast.success("Collection created successfully");
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.push("/collections");
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? error?.message ?? "Something went wrong";
      toast.error("Failed to create collection", {
        description: Array.isArray(msg) ? msg.join(", ") : String(msg),
      });
    },
  });

  const onSubmit = async (data: CollectionFormValues) => {
    setIsSubmitting(true);
    try {
      // Upload a newly-picked cover image to Cloudinary and take its URL.
      let imageUrl: string | undefined;
      const picked = data.image?.[0];
      if (picked?.file) {
        const result = await uploadProductImages([picked.file]);
        if (result.uploaded.length > 0) {
          imageUrl = result.uploaded[0].url;
        } else {
          toast.error("Image upload failed", {
            description: result.failed.map((f) => f.fileName).join(", "),
          });
          return;
        }
      } else if (typeof picked?.url === "string" && /^https?:\/\//.test(picked.url)) {
        // Already-hosted URL (e.g. pasted) — keep as-is.
        imageUrl = picked.url;
      }

      await createMutation.mutateAsync({
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || undefined,
        description: data.description?.trim() || undefined,
        image: imageUrl,
        enabled: data.enabled,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Create Collection
          </h1>
          <p className="text-muted-foreground mt-1">
            Add a new collection to the homepage &quot;Shop by mood&quot; section
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Essentials" {...field} />
                    </FormControl>
                    <FormDescription>
                      Shown on the homepage &quot;Shop by mood&quot; tile and in
                      the shop filters.
                    </FormDescription>
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
                    <FormDescription>
                      Small caption shown under the title on the tile.
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
                      Uploaded to Cloudinary on save. Optional.
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
              {isSubmitting ? "Creating..." : "Create Collection"}
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
