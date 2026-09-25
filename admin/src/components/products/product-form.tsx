"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
import * as z from "zod";
import {
  Loader2,
  Plus,
  ImageOff,
  Info,
  Upload,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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
import {
  collectionsService,
  type Collection,
} from "@/services/collections.service";
import { uploadProductImages } from "@/services/uploads.service";
import { useFabrics } from "@/hooks/use-fabrics";
import {
  ColorVariantCard,
  type ColorVariant,
  type ImageItem,
} from "@/components/products/color-variant-card";
import { cn } from "@/lib/utils";

/** Server-side maximum page size — used where a picker renders every option. */
const PICKER_LIMIT = 100;

// ---------------------------------------------------------------------------
// Lean product form — writes to the real NestJS backend (via productsService,
// which routes products through realApi). Fields mirror the storefront's LEAN
// Product model 1:1: title, gender, category, price (whole INR), compareAtPrice,
// images (URLs), sizes, colours, flags, etc. There is no SKU / brand / media
// upload here — the storefront doesn't have those concepts.
//
// Images: the lean server stores `images: string[]`. Locally-picked files are
// held in memory (with an object-URL preview) and only sent to POST
// /uploads/images — which stores them in Cloudinary and returns URLs — when the
// admin saves. Existing products' hosted URLs are kept as-is. Either way the
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
    description: z.string().min(10, "Description must be at least 10 characters"),
    fabric: z.string().min(1, "Fabric is required"),
    care: z.string().min(1, "Care instructions are required"),
    tagsText: z.string().optional(),
    isNew: z.boolean(),
    onSale: z.boolean(),
    essential: z.boolean(),
    isActive: z.boolean(),
    // "Show reviews" — stored inverted on the product as `reviewsHidden`. Off by
    // default for new products (reviews stay hidden until the admin opts in).
    showReviews: z.boolean(),
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

// `ImageItem` and `ColorVariant` are shared with the per-colour card component
// (color-variant-card.tsx). A product image is either an already-hosted URL
// (existing products / prior uploads) or a locally-selected File not yet
// uploaded — local files are only pushed to Cloudinary when the admin saves the
// form (see onSubmit); until then they show an object-URL preview + "Pending".

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
  //
  // Fetched as one bounded page rather than scroll-loaded: this is a hand-
  // maintained pick-list of a few dozen entries, and the field also accepts a
  // typed-in value, so the dropdown is a convenience rather than the only way
  // to set it. PICKER_LIMIT is the server's maximum page size.
  const { data: fabricPage } = useFabrics({ limit: PICKER_LIMIT });
  const fabricOptions = (fabricPage?.data ?? []).map((f) => f.name);

  // Admin-managed collections ("Shop by mood"). A product may belong to many;
  // membership is stored on the product as an array of collection slugs.
  // Rendered as chips (all at once), so this is bounded rather than paged.
  const { data: collectionPage } = useAdminQuery(
    ["collections", "product-form"],
    () => collectionsService(axiosAuth).getAll({ limit: PICKER_LIMIT }),
    { showErrorToast: false },
  );
  const collectionList: Collection[] = collectionPage?.data ?? [];

  const p = product as any;

  // Arrays live outside RHF for simple add/remove UX. Existing product images
  // come in as hosted URLs; newly picked files stay local until submit.
  const [images, setImages] = useState<ImageItem[]>(() =>
    Array.isArray(p?.images)
      ? p.images
          .filter((x: unknown): x is string => typeof x === "string")
          .map((url: string) => ({ kind: "url" as const, url }))
      : [],
  );
  const [colors, setColors] = useState<ColorVariant[]>(() =>
    Array.isArray(p?.colors)
      ? p.colors.map((c: any) => ({
          name: c?.name ?? "",
          hex: c?.hex ?? "#000000",
          images: Array.isArray(c?.images)
            ? c.images
                .filter((x: unknown): x is string => typeof x === "string")
                .map((url: string) => ({ kind: "url" as const, url }))
            : [],
          sizes: Array.isArray(c?.sizes)
            ? c.sizes.filter((x: unknown) => typeof x === "string")
            : [],
          soldOutSizes: Array.isArray(c?.soldOutSizes)
            ? c.soldOutSizes.filter((x: unknown) => typeof x === "string")
            : [],
          price: typeof c?.price === "number" ? c.price : undefined,
          compareAtPrice:
            typeof c?.compareAtPrice === "number" ? c.compareAtPrice : undefined,
          stock: typeof c?.stock === "number" ? c.stock : undefined,
        }))
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
  // Collection slugs this product belongs to. Prefer the array; fall back to the
  // deprecated single `collection` slug so legacy products don't lose membership.
  const [selectedCollections, setSelectedCollections] = useState<string[]>(() => {
    if (Array.isArray(p?.collections)) {
      return p.collections.filter((x: unknown) => typeof x === "string");
    }
    return typeof p?.collection === "string" && p.collection ? [p.collection] : [];
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: p?.title ?? p?.name ?? "",
      gender: (p?.gender as ProductFormValues["gender"]) ?? "women",
      category: p?.category ?? "",
      price: p?.price ?? undefined,
      compareAtPrice: p?.compareAtPrice ?? undefined,
      stock: p?.stock ?? p?.stockQuantity ?? 0,
      description: p?.description ?? "",
      fabric: p?.fabric ?? "",
      care: p?.care ?? "",
      tagsText: Array.isArray(p?.tags) ? p.tags.join(", ") : "",
      isNew: p?.isNew ?? false,
      onSale: p?.onSale ?? false,
      essential: p?.essential ?? false,
      isActive: p?.isActive ?? true,
      // New products default to OFF (reviews hidden); editing loads the product's
      // current state — `showReviews` is the inverse of `reviewsHidden`.
      showReviews: mode === "create" ? false : !(p?.reviewsHidden ?? false),
    },
  });

  const addColor = () =>
    setColors((c) => [
      ...c,
      {
        name: "",
        hex: "#000000",
        images: [],
        sizes: [],
        soldOutSizes: [],
        price: undefined,
        compareAtPrice: undefined,
        stock: undefined,
      },
    ]);
  const removeColor = (i: number) =>
    setColors((c) => c.filter((_, idx) => idx !== i));
  const updateColor = (i: number, patch: Partial<ColorVariant>) =>
    setColors((c) => c.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const removeImage = (i: number) =>
    setImages((imgs) => {
      const target = imgs[i];
      if (target?.kind === "file") URL.revokeObjectURL(target.preview);
      return imgs.filter((_, idx) => idx !== i);
    });

  // Image order IS the display order everywhere — images[0] is the primary /
  // thumbnail. Admins reorder by dragging (desktop) or the ◀ ▶ / ★ controls
  // (works on touch too, where native drag-and-drop doesn't fire).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveImage = (from: number, to: number) =>
    setImages((imgs) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= imgs.length ||
        to >= imgs.length
      ) {
        return imgs;
      }
      const next = [...imgs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const makePrimary = (i: number) => moveImage(i, 0);

  // Revoke any outstanding local previews on unmount to avoid leaking blobs.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => {
      for (const img of imagesRef.current) {
        if (img.kind === "file") URL.revokeObjectURL(img.preview);
      }
    },
    [],
  );

  // Local file selection — held in memory with an object-URL preview and only
  // uploaded to Cloudinary on submit (see onSubmit). Capped at MAX_IMAGES total.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed — keeping the first ${remaining}.`,
      );
      files = chosen.slice(0, remaining);
    }

    const items: ImageItem[] = files.map((file) => ({
      kind: "file",
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((imgs) => [...imgs, ...items]);
  };

  const onSubmit = async (data: ProductFormValues) => {
    setSubmitting(true);

    // Upload any locally-selected files to Cloudinary now (deferred from select),
    // then build ordered URL lists — hosted URLs stay in place, pending files are
    // swapped for their uploaded URLs. The product gallery and each colour's
    // gallery upload as SEPARATE calls so no single request exceeds the server's
    // per-request limit. Bail on any failure so we never save missing images.
    const uploadGroup = async (items: ImageItem[]): Promise<string[]> => {
      const pending = items.filter(
        (img): img is Extract<ImageItem, { kind: "file" }> =>
          img.kind === "file",
      );
      let uploadedUrls: string[] = [];
      if (pending.length > 0) {
        const result = await uploadProductImages(pending.map((f) => f.file));
        if (result.totalFailed > 0) {
          const e = new Error("upload-failed") as Error & {
            failed?: { fileName: string }[];
          };
          e.failed = result.failed;
          throw e;
        }
        uploadedUrls = result.uploaded.map((u) => u.url);
      }
      let next = 0;
      return items
        .map((img) => (img.kind === "url" ? img.url : uploadedUrls[next++]))
        .map((u) => (u ?? "").trim())
        .filter(Boolean);
    };

    let cleanImages: string[];
    let colorImageUrls: string[][];
    try {
      cleanImages = await uploadGroup(images);
      colorImageUrls = [];
      for (const c of colors) {
        colorImageUrls.push(await uploadGroup(c.images));
      }
    } catch (err: any) {
      if (Array.isArray(err?.failed)) {
        const n = err.failed.length;
        toast.error(`${n} image${n === 1 ? "" : "s"} failed to upload`, {
          description: err.failed
            .map((f: { fileName: string }) => f.fileName)
            .join(", "),
        });
      } else {
        const msg =
          err?.response?.data?.message ?? err?.message ?? "Upload failed";
        toast.error("Image upload failed", {
          description: Array.isArray(msg) ? msg.join(", ") : String(msg),
        });
      }
      setSubmitting(false);
      return;
    }

    // Build colours with their resolved images. Sold-out is clamped to the
    // colour's own sizes; blank numbers are omitted so the server stores null
    // (→ the colour inherits the product-level default).
    const cleanColors = colors
      .map((c, i) => ({
        name: c.name.trim(),
        hex: c.hex.trim(),
        images: colorImageUrls[i],
        sizes: c.sizes,
        soldOutSizes: c.soldOutSizes.filter((s) => c.sizes.includes(s)),
        price: typeof c.price === "number" ? c.price : undefined,
        compareAtPrice:
          typeof c.compareAtPrice === "number" ? c.compareAtPrice : undefined,
        stock: typeof c.stock === "number" ? c.stock : undefined,
      }))
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
      collections: selectedCollections,
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
      // Stored inverted: the switch is "Show reviews", the column is "hidden".
      reviewsHidden: !data.showReviews,
    };

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

  // Collection chips: every backend collection, plus any slug already on the
  // product that no longer maps to a live collection (so editing never silently
  // drops a membership). Options are {slug, label}.
  const collectionOptions = [
    ...collectionList.map((c) => ({ slug: c.slug, label: c.title })),
    ...selectedCollections
      .filter((slug) => !collectionList.some((c) => c.slug === slug))
      .map((slug) => ({ slug, label: slug })),
  ];

  const toggleCollection = (slug: string) =>
    setSelectedCollections((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug],
    );

  const compareAt = form.watch("compareAtPrice");
  const price = form.watch("price");
  const stock = form.watch("stock");
  const discountPct =
    compareAt && price && Number(compareAt) > Number(price)
      ? Math.round(((Number(compareAt) - Number(price)) / Number(compareAt)) * 100)
      : null;

  // Product-level defaults shown as placeholders in each colour card, so admins
  // can see at a glance what a blank per-colour field will inherit.
  const productDefaults = {
    price: typeof price === "number" ? price : undefined,
    compareAtPrice: typeof compareAt === "number" ? compareAt : undefined,
    stock: typeof stock === "number" ? stock : undefined,
  };

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

            <div className="space-y-2">
              <Label>Collections (optional)</Label>
              {collectionOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No collections yet — create some under Catalog → Collections.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {collectionOptions.map((c) => {
                    const active = selectedCollections.includes(c.slug);
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => toggleCollection(c.slug)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Tap to add this product to one or more homepage collections.
              </p>
            </div>
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
              Add up to {MAX_IMAGES} images. Photo #1 is the primary/thumbnail
              shown first everywhere — drag to reorder, or use ★ to set any photo
              as primary. Selected files upload to Cloudinary when you save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {images.length === 0 && (
              <p className="text-sm text-muted-foreground">No images yet.</p>
            )}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((img, i) => {
                  const src = img.kind === "url" ? img.url : img.preview;
                  const isPrimary = i === 0;
                  const isLast = i === images.length - 1;
                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => {
                        setDragIndex(i);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverIndex !== i) setDragOverIndex(i);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null) moveImage(dragIndex, i);
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={cn(
                        "group relative h-28 w-28 shrink-0 cursor-grab overflow-hidden rounded-md border bg-muted transition active:cursor-grabbing",
                        dragIndex === i && "opacity-50",
                        dragOverIndex === i &&
                          dragIndex !== i &&
                          "ring-2 ring-primary ring-offset-1",
                      )}
                    >
                      {src.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt=""
                          draggable={false}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}

                      {/* Position (1-based); the primary photo is always #1. */}
                      <span className="absolute left-1 top-1 z-20 rounded bg-background/90 px-1.5 text-[10px] font-semibold text-foreground shadow ring-1 ring-black/10">
                        {i + 1}
                      </span>

                      {/* Remove */}
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => removeImage(i)}
                        aria-label="Remove image"
                        className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow ring-1 ring-black/10 transition hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      {/* Reorder / set-primary controls. The backdrop is
                          pointer-events-none so a drag still starts anywhere on
                          the tile; each button re-enables pointer events. Shown
                          on hover (desktop) and always on touch. */}
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1 bg-black/45 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => moveImage(i, i - 1)}
                          disabled={isPrimary}
                          aria-label="Move left"
                          title="Move left"
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {!isPrimary && (
                          <button
                            type="button"
                            draggable={false}
                            onClick={() => makePrimary(i)}
                            aria-label="Set as primary"
                            title="Set as primary"
                            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          draggable={false}
                          onClick={() => moveImage(i, i + 1)}
                          disabled={isLast}
                          aria-label="Move right"
                          title="Move right"
                          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Pending upload */}
                      {img.kind === "file" && (
                        <span className="absolute bottom-1 left-1 z-20 rounded bg-amber-500/90 px-1 text-[9px] font-medium text-white">
                          Pending
                        </span>
                      )}

                      {/* Primary marker */}
                      {isPrimary && (
                        <span className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 rounded bg-primary/90 px-1 text-[9px] font-medium text-primary-foreground">
                          <Star className="h-2.5 w-2.5 fill-current" /> Primary
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                disabled={submitting || images.length >= MAX_IMAGES}
              >
                <Upload className="mr-2 h-4 w-4" /> Upload images
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
            {/* Colours — each is a full variant. Tapping a colour on the
                storefront shows that colour's photos; its sizes/price/stock
                override the product defaults, and anything left blank inherits
                them. */}
            <div className="space-y-3">
              <Label>Colours</Label>
              {colors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No colours yet. Add one to give it its own photos, sizes or
                  price.
                </p>
              )}
              {colors.map((c, i) => (
                <ColorVariantCard
                  key={i}
                  variant={c}
                  sizeOptions={sizeOptions}
                  maxImages={MAX_IMAGES}
                  disabled={submitting}
                  productDefaults={productDefaults}
                  onChange={(patch) => updateColor(i, patch)}
                  onRemove={() => removeColor(i)}
                />
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
            <FlagSwitch
              form={form}
              name="isNew"
              label="New arrival"
              description="Show the “New” badge. A product can be New or On sale, not both."
              exclusiveWith={["onSale"]}
            />
            <FlagSwitch
              form={form}
              name="onSale"
              label="On sale"
              description="Show the “Sale” badge. A product can be On sale or New, not both."
              exclusiveWith={["isNew"]}
            />
            <FlagSwitch
              form={form}
              name="essential"
              label="Essential"
              description="Feature this product on the storefront’s Essentials page and homepage strip (not a card badge)."
            />
            <FlagSwitch
              form={form}
              name="showReviews"
              label="Show reviews"
              description="Off = the product page hides its reviews and star rating (the reviews are kept). Off by default."
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

// Small helper to keep the four boolean switches DRY. `exclusiveWith` lists
// sibling flags that must switch OFF when this one is turned ON, so only one of
// a mutually-exclusive group (e.g. New / On sale) can be active at a time.
function FlagSwitch({
  form,
  name,
  label,
  description,
  exclusiveWith,
}: {
  form: UseFormReturn<ProductFormValues>;
  name: "isActive" | "isNew" | "onSale" | "essential" | "showReviews";
  label: string;
  description: string;
  exclusiveWith?: Array<
    "isActive" | "isNew" | "onSale" | "essential" | "showReviews"
  >;
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
            <Switch
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                if (checked && exclusiveWith) {
                  for (const other of exclusiveWith) {
                    form.setValue(other, false, { shouldDirty: true });
                  }
                }
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
