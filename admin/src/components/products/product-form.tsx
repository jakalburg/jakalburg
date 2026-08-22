"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Loader2, Plus, Trash2, ImageOff, Info, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import { Product } from "@/types/product";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { productsService } from "@/services/products.service";
import { uploadProductImages } from "@/services/uploads.service";
import { useFabrics } from "@/hooks/use-fabrics";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Lean product form — writes to the real NestJS backend (via productsService,
// which routes products through realApi). Fields mirror the storefront's LEAN
// Product model 1:1: title, gender, category, price (whole INR), compareAtPrice,
// images (URLs), sizes, colours, flags, etc. There is no SKU / brand / media
// upload here — the storefront doesn't have those concepts.
//
// Images: the lean server stores `images: string[]`. The admin can either
// upload local files (sent to POST /uploads/images, which stores them in
// Cloudinary and returns URLs) or paste already-hosted URLs. Either way the
// resulting URL strings are what get saved on the product.
// ---------------------------------------------------------------------------

const GENDERS = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "unisex", label: "Unisex" },
] as const;

// Hard cap on images per product (matches the server's per-request limit).
const MAX_IMAGES = 10;

// Fixed size scale offered as chips. Products may carry legacy sizes outside
// this set (e.g. imported data) — those are preserved and shown too, see below.
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// A whole-rupee amount. Kept as a plain z.number() (NOT z.coerce / z.preprocess)
// so the schema's input type equals its output type — required for @hookform/
// resolvers v5, which otherwise can't reconcile useForm<ProductFormValues>. The
// numeric <Input>s convert "" → undefined / string → number in their onChange.
const rupees = z
  .number({ invalid_type_error: "Enter a whole number", required_error: "Required" })
  .int("Use whole rupees")
  .min(0, "Must be ≥ 0");

const productFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    gender: z.enum(["women", "men", "unisex"]),
    category: z.string().min(1, "Category is required"),
    price: rupees,
    compareAtPrice: z
      .number({ invalid_type_error: "Enter a whole number" })
      .int("Use whole rupees")
      .min(0)
      .optional(),
    stock: rupees,
    collection: z.string().optional(),
    description: z.string().min(10, "Description must be at least 10 characters"),
    fabric: z.string().min(1, "Fabric is required"),
    care: z.string().min(1, "Care instructions are required"),
    tagsText: z.string().optional(),
    isNew: z.boolean(),
    onSale: z.boolean(),
    essential: z.boolean(),
    isActive: z.boolean(),
  })
  .refine(
    (d) =>
      d.compareAtPrice === undefined ||
      d.compareAtPrice === 0 ||
      d.compareAtPrice > d.price,
    {
      message: "Compare-at price should be higher than the selling price",
      path: ["compareAtPrice"],
    },
  );

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  mode: "create" | "edit";
  /** Where Cancel/Save should return to. Defaults to the unfiltered products list. */
  backHref?: string;
  /**
   * Legacy Steal-Deal flag from the rich model. Steal-deal bundles aren't part
   * of the lean catalogue, so this only shows an explanatory notice — the form
   * still creates a normal product.
   */
  dealMode?: boolean;
}

interface ColorRow {
  name: string;
  hex: string;
}

/** "S, M, L" → ["S","M","L"] (trimmed, de-duped, empties dropped). */
function parseList(text?: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const v = raw.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function ProductForm({
  product,
  mode,
  backHref = "/products",
  dealMode = false,
}: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const axiosAuth = useAxiosAuth(); // passed through for signature compat; products use realApi
  const [submitting, setSubmitting] = useState(false);

  // Existing category slugs, so the category field can offer "select or type".
  const { data: categoryOptions = [] } = useAdminQuery<string[]>(
    ["product-categories"],
    () => productsService(axiosAuth).getCategories(),
    { showErrorToast: false },
  );

  // Curated fabric list (real backend), so the fabric field can offer
  // "select or type". Products still store fabric as a plain string.
  const { data: fabricList = [] } = useFabrics();
  const fabricOptions = fabricList.map((f) => f.name);

  const p = product as any;

  // Arrays live outside RHF for simple add/remove UX.
  const [images, setImages] = useState<string[]>(() =>
    Array.isArray(p?.images) ? p.images.filter((x: unknown) => typeof x === "string") : [],
  );
  const [colors, setColors] = useState<ColorRow[]>(() =>
    Array.isArray(p?.colors)
      ? p.colors.map((c: any) => ({ name: c?.name ?? "", hex: c?.hex ?? "#000000" }))
      : [],
  );
  const [sizes, setSizes] = useState<string[]>(() =>
    Array.isArray(p?.sizes) ? p.sizes.filter((x: unknown) => typeof x === "string") : [],
  );
  const [soldOutSizes, setSoldOutSizes] = useState<string[]>(() =>
    Array.isArray(p?.soldOutSizes)
      ? p.soldOutSizes.filter((x: unknown) => typeof x === "string")
      : [],
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: p?.title ?? p?.name ?? "",
      gender: (p?.gender as ProductFormValues["gender"]) ?? "women",
      category: p?.category ?? "",
      price: p?.price ?? undefined,
      compareAtPrice: p?.compareAtPrice ?? undefined,
      stock: p?.stock ?? p?.stockQuantity ?? 0,
      collection: p?.collection ?? "",
      description: p?.description ?? "",
      fabric: p?.fabric ?? "",
      care: p?.care ?? "",
      tagsText: Array.isArray(p?.tags) ? p.tags.join(", ") : "",
      isNew: p?.isNew ?? false,
      onSale: p?.onSale ?? false,
      essential: p?.essential ?? false,
      isActive: p?.isActive ?? true,
    },
  });

  const addColor = () => setColors((c) => [...c, { name: "", hex: "#000000" }]);
  const removeColor = (i: number) =>
    setColors((c) => c.filter((_, idx) => idx !== i));
  const updateColor = (i: number, patch: Partial<ColorRow>) =>
    setColors((c) => c.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addImage = () => setImages((imgs) => [...imgs, ""]);
  const removeImage = (i: number) =>
    setImages((imgs) => imgs.filter((_, idx) => idx !== i));
  const updateImage = (i: number, url: string) =>
    setImages((imgs) => imgs.map((v, idx) => (idx === i ? url : v)));

  // Local file upload → Cloudinary (via the real backend), appending the
  // returned URLs to the images list. Capped at MAX_IMAGES total.
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilesChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so the same file can be re-picked later
    if (chosen.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    let files = chosen;
    if (chosen.length > remaining) {
      toast.warning(
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed — uploading the first ${remaining}.`,
      );
      files = chosen.slice(0, remaining);
    }

    setUploading(true);
    try {
      const result = await uploadProductImages(files);
      if (result.uploaded.length > 0) {
        setImages((imgs) => [...imgs, ...result.uploaded.map((u) => u.url)]);
        toast.success(
          `Uploaded ${result.totalUploaded} image${result.totalUploaded === 1 ? "" : "s"}.`,
        );
      }
      if (result.totalFailed > 0) {
        toast.error(
          `${result.totalFailed} image${result.totalFailed === 1 ? "" : "s"} failed to upload`,
          { description: result.failed.map((f) => f.fileName).join(", ") },
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Upload failed";
      toast.error("Image upload failed", {
        description: Array.isArray(msg) ? msg.join(", ") : String(msg),
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    const cleanImages = images.map((u) => u.trim()).filter(Boolean);
    const cleanColors = colors
      .map((c) => ({ name: c.name.trim(), hex: c.hex.trim() }))
      .filter((c) => c.name.length > 0)
      .map((c, i) => ({ ...c, position: i }));

    const payload = {
      title: data.title.trim(),
      gender: data.gender,
      category: data.category.trim(),
      price: data.price,
      compareAtPrice:
        data.compareAtPrice && data.compareAtPrice > 0 ? data.compareAtPrice : null,
      stock: data.stock,
      collection: data.collection?.trim() ? data.collection.trim() : null,
      description: data.description.trim(),
      fabric: data.fabric.trim(),
      care: data.care.trim(),
      images: cleanImages,
      sizes,
      soldOutSizes: soldOutSizes.filter((s) => sizes.includes(s)),
      tags: parseList(data.tagsText),
      colors: cleanColors,
      isNew: data.isNew,
      onSale: data.onSale,
      essential: data.essential,
      isActive: data.isActive,
    };

    setSubmitting(true);
    try {
      const service = productsService(axiosAuth);
      if (mode === "create") {
        await service.create(payload);
        toast.success("Product created", {
          description: payload.isActive
            ? "It's live on the storefront."
            : "Saved as hidden — enable it to show on the storefront.",
        });
      } else {
        await service.update(product!.id, payload);
        toast.success("Product updated");
        queryClient.invalidateQueries({ queryKey: ["product", product!.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push(backHref);
      router.refresh();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Something went wrong";
      toast.error(
        mode === "create" ? "Failed to create product" : "Failed to update product",
        { description: Array.isArray(msg) ? msg.join(", ") : String(msg) },
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Size chips: the fixed scale plus any non-standard sizes already on the
  // product, so editing an imported product never silently drops its sizes.
  const extraSizes = sizes.filter((s) => !(SIZES as readonly string[]).includes(s));
  const sizeOptions = [...SIZES, ...extraSizes];
  const selectedSizesInOrder = sizeOptions.filter((s) => sizes.includes(s));

  const toggleSize = (s: string) => {
    const nextSizes = sizes.includes(s)
      ? sizes.filter((x) => x !== s)
      : sizeOptions.filter((x) => sizes.includes(x) || x === s);
    setSizes(nextSizes);
    // Sold-out is always a subset of the selected sizes.
    setSoldOutSizes((prev) => prev.filter((x) => nextSizes.includes(x)));
  };

  const toggleSoldOut = (s: string) => {
    if (!sizes.includes(s)) return;
    setSoldOutSizes((prev) =>
      prev.includes(s)
        ? prev.filter((x) => x !== s)
        : sizeOptions.filter((x) => prev.includes(x) || x === s),
    );
  };

  const compareAt = form.watch("compareAtPrice");
  const price = form.watch("price");
  const discountPct =
    compareAt && price && Number(compareAt) > Number(price)
      ? Math.round(((Number(compareAt) - Number(price)) / Number(compareAt)) * 100)
      : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-24">
        {dealMode && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Steal-Deal bundles aren&apos;t part of the current catalogue model.
              This form saves a normal product; the deal-specific fields are
              omitted.
            </p>
          </div>
        )}

        {/* Basics ------------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Basics</CardTitle>
            <CardDescription>
              What the product is and where it lives in the catalogue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Essential Cotton Tee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    <Combobox
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={categoryOptions}
                      placeholder="Select or type a category"
                      searchPlaceholder="Search or add a category…"
                      emptyText="No categories yet — type to add one."
                    />
                    <FormDescription>
                      Pick an existing category or type a new one (lowercase slug).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="collection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Essentials" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pricing & inventory ---------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing &amp; inventory</CardTitle>
            <CardDescription>All prices in whole rupees (₹).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid items-start gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="1290"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="compareAtPrice"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Compare-at (₹)</FormLabel>
                      {discountPct ? (
                        <span className="text-xs font-medium text-muted-foreground">
                          {discountPct}% off
                        </span>
                      ) : null}
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="1990"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === "" ? undefined : Number(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Media ------------------------------------------------------------ */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              Upload up to {MAX_IMAGES} images (stored on Cloudinary) or paste
              hosted URLs. The first image is the primary/thumbnail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {images.length === 0 && (
              <p className="text-sm text-muted-foreground">No images yet.</p>
            )}
            {images.map((url, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {url.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget.style.display = "none");
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                  {i === 0 && url.trim() && (
                    <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-center text-[9px] font-medium text-primary-foreground">
                      Primary
                    </span>
                  )}
                </div>
                <Input
                  value={url}
                  onChange={(e) => updateImage(i, e.target.value)}
                  placeholder="https://…/image.jpg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFilesChosen}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading…" : "Upload images"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addImage}
                disabled={images.length >= MAX_IMAGES}
              >
                <Plus className="mr-2 h-4 w-4" /> Add image URL
              </Button>
              <span className="text-xs text-muted-foreground">
                {images.length}/{MAX_IMAGES}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Variants: colours & sizes ---------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Variants</CardTitle>
            <CardDescription>Colours and sizes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Colours */}
            <div className="space-y-3">
              <Label>Colours</Label>
              {colors.length === 0 && (
                <p className="text-sm text-muted-foreground">No colours yet.</p>
              )}
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => updateColor(i, { hex: e.target.value })}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-background"
                    aria-label="Colour swatch"
                  />
                  <Input
                    value={c.name}
                    onChange={(e) => updateColor(i, { name: e.target.value })}
                    placeholder="Colour name (e.g. Ivory)"
                  />
                  <Input
                    value={c.hex}
                    onChange={(e) => updateColor(i, { hex: e.target.value })}
                    placeholder="#f4efe6"
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColor(i)}
                    aria-label="Remove colour"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addColor}>
                <Plus className="mr-2 h-4 w-4" /> Add colour
              </Button>
            </div>

            <Separator />

            {/* Sizes — fixed scale, tap to toggle. */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Sizes</Label>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((s) => {
                    const active = sizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSize(s)}
                        aria-pressed={active}
                        className={cn(
                          "min-w-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Tap to toggle the sizes this product comes in.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Sold-out sizes</Label>
                {selectedSizesInOrder.length === 0 ? (
                  <p className="pt-1 text-sm text-muted-foreground">
                    Select sizes first, then mark any that are sold out.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedSizesInOrder.map((s) => {
                      const active = soldOutSizes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSoldOut(s)}
                          aria-pressed={active}
                          className={cn(
                            "min-w-11 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                            active
                              ? "border-destructive bg-destructive/10 text-destructive line-through"
                              : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  Marked sizes show as sold out on the storefront.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details ---------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Copy shown on the product page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Describe the product…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fabric"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fabric</FormLabel>
                    <Combobox
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={fabricOptions}
                      placeholder="Select or type a fabric"
                      searchPlaceholder="Search or add a fabric…"
                      emptyText="No fabrics yet — type to add one, or manage them under Catalog → Fabrics."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="care"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Care</FormLabel>
                    <FormControl>
                      <Input placeholder="Machine wash cold." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="tagsText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="polo, summer, cotton" {...field} />
                  </FormControl>
                  <FormDescription>Comma-separated.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Visibility & flags ----------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle>Visibility &amp; flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FlagSwitch
              form={form}
              name="isActive"
              label="Active"
              description="Off = hidden from the storefront (kept in the catalogue)."
            />
            <FlagSwitch form={form} name="isNew" label="New arrival" description="Show the “New” badge." />
            <FlagSwitch form={form} name="onSale" label="On sale" description="Show the “Sale” badge." />
            <FlagSwitch
              form={form}
              name="essential"
              label="Essential"
              description="Feature in the Essentials edit."
            />
          </CardContent>
        </Card>

        {/* Actions ---------------------------------------------------------- */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(backHref)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create product" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// Small helper to keep the four boolean switches DRY.
function FlagSwitch({
  form,
  name,
  label,
  description,
}: {
  form: UseFormReturn<ProductFormValues>;
  name: "isActive" | "isNew" | "onSale" | "essential";
  label: string;
  description: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
