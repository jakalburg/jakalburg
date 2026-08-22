"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { couponsService } from "@/services";
import { uploadService } from "@/services/upload.service";
import { CouponImageUpload } from "@/components/coupons/coupon-image-upload";
import useAxiosAuth from "@/hooks/use-axios-auth";

const couponFormSchema = z.object({
  couponCode: z.string().min(3, "Coupon code must be at least 3 characters"),
  title: z.string().min(1, "Title is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountAmount: z.coerce.number().min(0, "Discount amount must be positive"),
  minimumAmount: z.coerce.number().min(0, "Minimum amount must be positive"),
  endDate: z.string().min(1, "End date is required"),
  productType: z.string().optional(),
  maxUsage: z
    .union([z.coerce.number().min(1), z.literal("").transform(() => undefined)])
    .optional(),
  status: z.enum(["active", "inactive"]).optional(),
  logo: z.string().optional(),
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const couponId = params.id as string;
  const axiosAuth = useAxiosAuth();

  const { data: coupon, isLoading } = useQuery({
    queryKey: ["coupon", couponId],
    queryFn: () => couponsService(axiosAuth).getById(couponId),
  });

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema) as any,
    defaultValues: {
      couponCode: "",
      title: "Discount Coupon",
      discountType: "percentage",
      discountAmount: 0,
      minimumAmount: 0,
      endDate: "",
      productType: "all",
      status: "active",
    },
  });

  useEffect(() => {
    if (coupon) {
      // Format date to YYYY-MM-DD for input[type="date"]
      const formattedDate = coupon.endDate
        ? new Date(coupon.endDate).toISOString().split("T")[0]
        : "";

      setPreviewUrl(coupon.logo || "");

      form.reset({
        couponCode: coupon.couponCode,
        title: coupon.title,
        discountType: coupon.discountType || "percentage",
        discountAmount: coupon.discountAmount,
        minimumAmount: coupon.minimumAmount,
        endDate: formattedDate,
        productType: coupon.productType || "all",
        maxUsage: coupon.maxUsage,
        status: coupon.status,
        logo: coupon.logo || "",
      });
    }
  }, [coupon, form]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CouponFormValues>) =>
      couponsService(axiosAuth).update(couponId, data),
    onSuccess: () => {
      toast.success("Coupon updated successfully");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["coupon", couponId] });
      router.push("/catalog/coupons");
    },
    onError: (error: any) => {
      toast.error("Failed to update coupon", {
        description: error.message,
      });
    },
  });

  const onSubmit = async (data: CouponFormValues) => {
    setIsSubmitting(true);
    try {
      let logoUrl = data.logo;

      if (selectedFile) {
        const response =
          await uploadService(axiosAuth).uploadImage(selectedFile);
        logoUrl = response.publicUrl;
      }

      // If we have a preview URL (potentially from existing data) but no selected file,
      // check if logo was cleared (handled by handleFileSelect(null))
      // If logo is cleared, previewUrl is empty string, data.logo is empty string.

      await updateMutation.mutateAsync({
        ...data,
        logo: logoUrl,
      });
    } catch (error: any) {
      toast.error("Failed to update coupon", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      form.setValue("logo", url); // Placeholder
    } else {
      setPreviewUrl("");
      form.setValue("logo", "");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">Loading...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog/coupons">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Coupon</h1>
          <p className="text-muted-foreground mt-1">Update coupon details</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit as any)}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Coupon Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., SAVE20"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>Unique coupon code</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 20% Off"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="discountAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 20"
                          {...field}
                          value={(field.value as string | number) ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        {form.watch("discountType") === "percentage"
                          ? "Percentage (%)"
                          : "Amount (₹)"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="minimumAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Order Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 500"
                          {...field}
                          value={(field.value as string | number) ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>Minimum cart value (₹)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control as any}
                  name="productType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Type</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Product Type"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave as 'all' for all products
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="maxUsage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Usage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Optional"
                          {...field}
                          value={(field.value as string | number) ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Coupon Image</label>
                <CouponImageUpload
                  previewUrl={previewUrl}
                  onFileSelect={handleFileSelect}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Optional: Upload a logo or image for this coupon
                </p>
              </div>

              <FormField
                control={form.control as any}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              asChild
              disabled={isSubmitting}
            >
              <Link href="/catalog/coupons">Cancel</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
