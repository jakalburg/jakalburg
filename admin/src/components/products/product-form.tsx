"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type FieldErrors,
  type UseFormReturn,
} from "react-hook-form";
import * as z from "zod";
import { Loader2, Plus, Info, Upload } from "lucide-react";
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
} from "@/components/products/color-variant-card";
import {
  ImageItemGallery,
  type ImageItem,
} from "@/components/products/image-item-gallery";
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
    // The colour the product-level photos actually depict. Optional in the
    // schema because whether it's required depends on state Zod can't see
    // (whether any photos and any other colours exist) — enforced in `submit`.
    baseColorName: z.string().optional(),
    baseColorHex: z.string().optional(),
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

/**
 * Human labels for the "can't save yet" toast, keyed by schema field. Listed in
 * the order the fields appear on the form so the toast reads top-to-bottom.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  gender: "Gender",
  category: "Category",
  price: "Price",
  compareAtPrice: "Compare-at price",
  stock: "Stock",
  baseColorName: "Colour of the main photos",
  description: "Description",
  fabric: "Fabric",
  care: "Care instructions",
};

const DEFAULT_SWATCH = "#000000";

const toUrlList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((x: unknown): x is string => typeof x === "string")
    : [];

/**
 * Does this colour's gallery hold exactly the product-level photos, in order?
 *
 * That is the signature of the base colour this form writes on save, so on the
 * way back in it can be lifted into the Images card instead of being listed a
 * second time under Variants — otherwise every re-save would add a duplicate.
 */
const isBaseColor = (colorImages: string[], productImages: string[]): boolean =>
  productImages.length > 0 &&
  colorImages.length === productImages.length &&
  colorImages.every((url, i) => url === productImages[i]);

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
  // A leading colour whose gallery IS the product images is the base colour
  // this form wrote last time: lift it into the Images card rather than showing
  // it again as a variant. Anything else loads as a normal variant.
  const loadedBaseColor = (() => {
    const first = Array.isArray(p?.colors) ? p.colors[0] : undefined;
    if (!first) return null;
    return isBaseColor(toUrlList(first.images), toUrlList(p?.images))
      ? {
          name: typeof first.name === "string" ? first.name : "",
          hex: typeof first.hex === "string" ? first.hex : DEFAULT_SWATCH,
        }
      : null;
  })();

  const [colors, setColors] = useState<ColorVariant[]>(() =>
    Array.isArray(p?.colors)
      ? (loadedBaseColor ? p.colors.slice(1) : p.colors).map((c: any) => ({
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
      baseColorName: loadedBaseColor?.name ?? "",
      baseColorHex: loadedBaseColor?.hex ?? DEFAULT_SWATCH,
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

  // Image order IS the display order everywhere — images[0] is the primary /
  // thumbnail. Reordering, set-primary and removal all live in
  // <ImageItemGallery>, which the per-colour strip shares.

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

  /**
   * Validation failed, so `onSubmit` never runs and nothing is saved.
   *
   * This form is several screens tall, so the offending field is usually well
   * outside the viewport when the admin reaches the Create button at the
   * bottom — leaving the button looking simply dead. Name what's wrong, then
   * take them to the first one.
   */
  const onInvalid = (errors: FieldErrors<ProductFormValues>) => {
    const labels = Object.keys(FIELD_LABELS).filter((name) => name in errors);
    // Any key the map doesn't cover (a new schema field) still gets counted.
    const unmapped = Object.keys(errors).filter(
      (name) => !(name in FIELD_LABELS),
    );
    const named = [...labels.map((n) => FIELD_LABELS[n]), ...unmapped];

    toast.error(
      named.length === 1
        ? `${named[0]} needs fixing before you can save`
        : `${named.length} fields need fixing before you can save`,
      { description: named.join(" · ") },
    );

    // Wait for the messages to render, then jump to the FIRST one in document
    // order — which is the first one visually, whatever control it belongs to.
    // Targeting by field name wouldn't do: the Selects don't expose one, so
    // gender/category would be silently skipped.
    requestAnimationFrame(() => {
      const message = document.querySelector('[data-slot="form-message"]');
      const target = message?.closest('[data-slot="form-item"]') ?? message;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  /**
   * The product photos stand in for any colour that has none of its own
   * (storefront: `colorObj?.images?.length ? colorObj.images : product.images`),
   * and the product page preselects the FIRST colour. So once a second colour
   * exists, unlabelled product photos are actively wrong — add "Navy" and it
   * shows the ivory shots. Naming them is what stops that.
   *
   * Only required once both exist: photos to attribute, and another colour to
   * confuse them with. A single-colour product has no ambiguity to resolve.
   */
  const baseColorRequired = images.length > 0 && colors.length > 0;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Run the schema first so a missing title and a missing base colour are
    // reported in the same pass rather than one dialog at a time.
    const schemaValid = await form.trigger();
    const missingBaseColor =
      baseColorRequired && !form.getValues("baseColorName")?.trim();

    if (missingBaseColor) {
      form.setError("baseColorName", {
        type: "manual",
        message: "Name the colour these photos show",
      });
    }

    if (!schemaValid || missingBaseColor) {
      onInvalid({
        ...form.formState.errors,
        ...(missingBaseColor
          ? { baseColorName: { type: "manual", message: "Required" } }
          : {}),
      });
      return;
    }

    await onSubmit(form.getValues());
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
    const variantColors = colors.map((c, i) => ({
      name: c.name.trim(),
      hex: c.hex.trim(),
      images: colorImageUrls[i],
      sizes: c.sizes,
      soldOutSizes: c.soldOutSizes.filter((s) => c.sizes.includes(s)),
      price: typeof c.price === "number" ? c.price : undefined,
      compareAtPrice:
        typeof c.compareAtPrice === "number" ? c.compareAtPrice : undefined,
      stock: typeof c.stock === "number" ? c.stock : undefined,
    }));

    // The named product photos become a colour in their own right, first in the
    // list so the storefront preselects it. Its sizes/price/stock are left
    // empty on purpose: blank means "inherit the product-level value", which is
    // exactly what these photos represented before they had a name.
    const baseColorName = data.baseColorName?.trim() ?? "";
    const baseKey = baseColorName.toLowerCase();

    // Naming the photos after a colour that's already listed below is the
    // normal case when labelling an existing product — every colour in the
    // seeded catalogue has an empty gallery and leans on these photos. Fold the
    // two into one entry: the photos come from here, but that colour's own
    // sizes/price/stock overrides are carried across rather than dropped.
    const twin = baseKey
      ? variantColors.find((c) => c.name.toLowerCase() === baseKey)
      : undefined;

    const baseColor =
      baseColorName && cleanImages.length > 0
        ? [
            {
              ...(twin ?? {
                sizes: [] as string[],
                soldOutSizes: [] as string[],
                price: undefined,
                compareAtPrice: undefined,
                stock: undefined,
              }),
              name: baseColorName,
              hex: (data.baseColorHex || DEFAULT_SWATCH).trim(),
              images: cleanImages,
            },
          ]
        : [];

    // Only drop the twin when the base entry actually replaced it — with no
    // photos there is no base entry, and filtering would delete the colour.
    const absorbed = baseColor.length > 0 ? twin : undefined;
    const cleanColors = [
      ...baseColor,
      ...variantColors.filter((c) => c !== absorbed),
    ]
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
      <form onSubmit={submit} className="space-y-6 pb-24">
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

            {/* Which colour these photos actually show. Saved as the product's
                first colour, so the storefront opens on it. */}
            {images.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-start">
                <FormField
                  control={form.control}
                  name="baseColorName"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Colour of these photos
                        {baseColorRequired && (
                          <span className="text-destructive"> *</span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="e.g. Ivory"
                          disabled={submitting}
                        />
                      </FormControl>
                      <FormDescription>
                        {baseColorRequired
                          ? "Required once you add another colour — these photos stand in for any colour without its own, so they need to say which one they are."
                          : "Optional. Naming them adds them as this product's first colour."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baseColorHex"
                  render={({ field }) => (
                    <FormItem className="sm:w-28">
                      <FormLabel>Swatch</FormLabel>
                      <FormControl>
                        <Input
                          type="color"
                          {...field}
                          value={field.value || DEFAULT_SWATCH}
                          disabled={submitting}
                          className="h-9 w-full cursor-pointer p-1"
                          aria-label="Swatch for these photos"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <ImageItemGallery images={images} onChange={setImages} size="md" />
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
              <Label>Additional colours</Label>
              <p className="text-xs text-muted-foreground">
                The photos in the Images card above are this product&apos;s
                first colour. Add the others here — each needs its own photos,
                or it falls back to showing those.
              </p>
              {colors.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No other colours yet. Add one to give it its own photos, sizes
                  or price.
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
