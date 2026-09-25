"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Wand2 } from "lucide-react";
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

const couponFormSchema = z
  .object({
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
  })
  .superRefine((data, ctx) => {
    // A percentage discount over 100% would give the whole order away (and then some).
    if (data.discountType === "percentage" && data.discountAmount > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountAmount"],
        message: "Percentage discount can't exceed 100%",
      });
    }
  });

type CouponFormValues = z.infer<typeof couponFormSchema>;

export default function CreateCouponPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const axiosAuth = useAxiosAuth();

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
      maxUsage: undefined,
      status: "active",
      logo: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CouponFormValues>) =>
      couponsService(axiosAuth).create(data),
    onSuccess: () => {
      toast.success("Coupon created successfully");
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      router.push("/catalog/coupons");
    },
    onError: (error: any) => {
      toast.error("Failed to create coupon", {
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

      await createMutation.mutateAsync({
        ...data,
        logo: logoUrl,
      });
    } catch (error: any) {
      toast.error("Failed to process request", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build a readable random code — no ambiguous characters (0/O, 1/I) so it's
  // easy to read off a screen or type by hand. The server uppercases anyway.
  const generateCouponCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    form.setValue("couponCode", code, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      // We don't strictly need to set the form value for logo if it's optional,
      // but it might help validation if we had any.
      // Since schema says optional string, we can just leave it or set a placeholder.
      form.setValue("logo", url); // using blob url as placeholder matches schema string type
    } else {
      setPreviewUrl("");
      form.setValue("logo", "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/catalog/coupons">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Coupon</h1>
          <p className="text-muted-foreground mt-1">
            Add a new discount coupon
          </p>
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
                  control={form.control}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code *</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="e.g., SAVE20"
                            {...field}
                            disabled={isSubmitting}
                            className="uppercase"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={generateCouponCode}
                          disabled={isSubmitting}
                          title="Generate random code"
                          aria-label="Generate random coupon code"
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>Unique coupon code</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  control={form.control}
                  name="discountAmount"
                  render={({ field }) => {
                    const isPercentage =
                      form.watch("discountType") === "percentage";
                    return (
                      <FormItem>
                        <FormLabel>Discount Amount *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={isPercentage ? 100 : undefined}
                            placeholder="e.g., 20"
                            {...field}
                            value={(field.value as string | number) ?? ""}
                            onChange={(e) => {
                              // Hard-cap at 100 while percentage so you can't
                              // even type a larger number.
                              let v = e.target.value;
                              if (isPercentage && v !== "" && Number(v) > 100) {
                                v = "100";
                              }
                              field.onChange(v);
                            }}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          {isPercentage ? "Percentage (0–100%)" : "Amount (₹)"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
              {isSubmitting ? "Creating..." : "Create Coupon"}
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
