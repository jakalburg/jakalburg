"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ImageItemGallery,
  type ImageItem,
} from "./image-item-gallery";

// Re-exported for the existing callers that import it from here; the type now
// lives with <ImageItemGallery>, which is what manipulates it.
export type { ImageItem };

// A colour is a full variant: it may carry its own images, sizes, sold-out set,
// price, compare-at and stock. Any array left empty / number left undefined
// inherits the product-level default on the storefront.
export interface ColorVariant {
  name: string;
  hex: string;
  images: ImageItem[];
  sizes: string[];
  soldOutSizes: string[];
  price?: number;
  compareAtPrice?: number;
  stock?: number;
}

interface ProductDefaults {
  price?: number;
  compareAtPrice?: number;
  stock?: number;
}

interface Props {
  variant: ColorVariant;
  /** Product size scale (fixed chips + any extras), for per-colour size toggles. */
  sizeOptions: string[];
  maxImages: number;
  disabled: boolean;
  /** Product-level values, shown as placeholders so admins see what's inherited. */
  productDefaults: ProductDefaults;
  onChange: (patch: Partial<ColorVariant>) => void;
  onRemove: () => void;
}

export function ColorVariantCard({
  variant,
  sizeOptions,
  maxImages,
  disabled,
  productDefaults,
  onChange,
  onRemove,
}: Props) {
  // Expand a colour by default only when it already carries overrides, so a
  // simple name+hex colour stays a tidy one-liner.
  const hasOverrides =
    variant.images.length > 0 ||
    variant.sizes.length > 0 ||
    variant.price !== undefined ||
    variant.compareAtPrice !== undefined ||
    variant.stock !== undefined;
  const [open, setOpen] = useState(hasOverrides);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke local previews on unmount (best-effort blob cleanup). The ref is kept
  // in sync via an effect (never written during render) so the unmount cleanup
  // sees the latest image list.
  const imagesRef = useRef(variant.images);
  useEffect(() => {
    imagesRef.current = variant.images;
  }, [variant.images]);
  useEffect(
    () => () => {
      for (const img of imagesRef.current) {
        if (img.kind === "file") URL.revokeObjectURL(img.preview);
      }
    },
    [],
  );

  const onFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so the same file can be re-picked
    if (chosen.length === 0) return;

    const remaining = maxImages - variant.images.length;
    if (remaining <= 0) {
      toast.error(`Up to ${maxImages} images per colour.`);
      return;
    }
    let files = chosen;
    if (chosen.length > remaining) {
      toast.warning(
        `Only ${remaining} more image${remaining === 1 ? "" : "s"} allowed for this colour.`,
      );
      files = chosen.slice(0, remaining);
    }
    const items: ImageItem[] = files.map((file) => ({
      kind: "file",
      file,
      preview: URL.createObjectURL(file),
    }));
    onChange({ images: [...variant.images, ...items] });
  };

  const toggleSize = (s: string) => {
    const next = variant.sizes.includes(s)
      ? variant.sizes.filter((x) => x !== s)
      : sizeOptions.filter((x) => variant.sizes.includes(x) || x === s);
    onChange({
      sizes: next,
      // Sold-out is always a subset of this colour's selected sizes.
      soldOutSizes: variant.soldOutSizes.filter((x) => next.includes(x)),
    });
  };

  const toggleSoldOut = (s: string) => {
    if (!variant.sizes.includes(s)) return;
    onChange({
      soldOutSizes: variant.soldOutSizes.includes(s)
        ? variant.soldOutSizes.filter((x) => x !== s)
        : sizeOptions.filter((x) => variant.soldOutSizes.includes(x) || x === s),
    });
  };

  const numberValue = (v: number | undefined) => (v ?? "") as number | "";
  const onNumber =
    (key: "price" | "compareAtPrice" | "stock") =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({
        [key]: e.target.value === "" ? undefined : Number(e.target.value),
      } as Partial<ColorVariant>);

  const selectedSizesInOrder = sizeOptions.filter((s) => variant.sizes.includes(s));

  return (
    <div className="rounded-lg border bg-card">
      {/* Header: swatch + name + hex, always editable inline. */}
      <div className="flex items-center gap-2 p-3">
        <input
          type="color"
          value={variant.hex}
          onChange={(e) => onChange({ hex: e.target.value })}
          className="h-9 w-11 shrink-0 cursor-pointer rounded border bg-background"
          aria-label="Colour swatch"
        />
        <Input
          value={variant.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Colour name (e.g. Ivory)"
        />
        <Input
          value={variant.hex}
          onChange={(e) => onChange({ hex: e.target.value })}
          placeholder="#f4efe6"
          className="hidden w-28 sm:block"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
          <span className="ml-1 hidden text-xs sm:inline">Per-colour</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove colour"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="space-y-5 border-t p-3">
          <p className="text-xs text-muted-foreground">
            Leave any field blank to use the product-level default for this
            colour.
          </p>

          {/* Per-colour images */}
          <div className="space-y-2">
            <Label>Photos for this colour</Label>
            <p className="text-xs text-muted-foreground">
              Photo #1 leads for this colour — drag to reorder, or use ★ to set
              any photo as primary.
            </p>
            <ImageItemGallery
              images={variant.images}
              onChange={(next) => onChange({ images: next })}
              size="sm"
              disabled={disabled}
            />
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
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || variant.images.length >= maxImages}
              >
                <Upload className="mr-2 h-4 w-4" /> Add photos
              </Button>
              <span className="text-xs text-muted-foreground">
                {variant.images.length === 0
                  ? "No photos → uses the product images."
                  : `${variant.images.length}/${maxImages}`}
              </span>
            </div>
          </div>

          {/* Per-colour sizes + sold-out */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Sizes for this colour</Label>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => {
                  const active = variant.sizes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      aria-pressed={active}
                      className={cn(
                        "min-w-10 rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
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
              <p className="text-xs text-muted-foreground">
                None selected → uses the product sizes.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sold-out sizes</Label>
              {selectedSizesInOrder.length === 0 ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  Pick this colour&apos;s sizes first, then mark any sold out.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSizesInOrder.map((s) => {
                    const active = variant.soldOutSizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSoldOut(s)}
                        aria-pressed={active}
                        className={cn(
                          "min-w-10 rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
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
            </div>
          </div>

          {/* Per-colour price / compare-at / stock overrides */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={numberValue(variant.price)}
                onChange={onNumber("price")}
                placeholder={
                  productDefaults.price !== undefined
                    ? `Default (₹${productDefaults.price})`
                    : "Default"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Compare-at (₹)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={numberValue(variant.compareAtPrice)}
                onChange={onNumber("compareAtPrice")}
                placeholder={
                  productDefaults.compareAtPrice !== undefined
                    ? `Default (₹${productDefaults.compareAtPrice})`
                    : "Default"
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={numberValue(variant.stock)}
                onChange={onNumber("stock")}
                placeholder={
                  productDefaults.stock !== undefined
                    ? `Default (${productDefaults.stock})`
                    : "Default"
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
