"use client";

import { useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageShimmer } from "@/components/ui/image-shimmer";

export interface ColorImageEntry {
  id: string;
  color: string;
  hexCode?: string;
  imageUrl: string;
}

export interface ProductImageOption {
  id: string;
  url: string;
  file?: File;
}

// Quick-pick basics — anything else goes through the custom color wheel.
const BASIC_COLORS: { name: string; hex: string }[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#FF0000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Green", hex: "#008000" },
];

interface ColorImageManagerProps {
  value: ColorImageEntry[];
  onChange: (value: ColorImageEntry[]) => void;
  /** Images already uploaded in the Product Images section above — the only
   * source for a color's image, so admins never have to leave the form to
   * pick a fresh file. */
  productImages: ProductImageOption[];
}

export function ColorImageManager({
  value,
  onChange,
  productImages,
}: ColorImageManagerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [pendingColor, setPendingColor] = useState<{
    name: string;
    hex: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [colorName, setColorName] = useState("");

  // Only already-uploaded images can be mapped to a color — never a fresh
  // upload of our own. Excluding still-pending (not yet saved) images here
  // is what stops a color from ever pointing at a separate, duplicate copy:
  // once picked, the color just reuses that image's existing URL as-is.
  const persistedProductImages = productImages.filter((img) => !img.file);

  const findByHex = (hex: string) =>
    value.find((v) => (v.hexCode || "").toLowerCase() === hex.toLowerCase());

  const openPickerForNewColor = (color: { name: string; hex: string }) => {
    setPendingColor(color);
    setColorName(color.name);
    setEditingId(null);
    setPickerOpen(true);
  };

  const openPickerForExisting = (entry: ColorImageEntry) => {
    setPendingColor({ name: entry.color, hex: entry.hexCode || "#cccccc" });
    setColorName(entry.color);
    setEditingId(entry.id);
    setPickerOpen(true);
  };

  const handleBasicColorClick = (color: { name: string; hex: string }) => {
    const existing = findByHex(color.hex);
    if (existing) {
      openPickerForExisting(existing);
    } else {
      openPickerForNewColor(color);
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const existing = findByHex(hex);
    if (existing) {
      openPickerForExisting(existing);
    } else {
      openPickerForNewColor({ name: hex, hex });
    }
  };

  const handleSelectImage = (img: ProductImageOption) => {
    if (!pendingColor) return;

    // Reuse the picked image's own URL as-is — never a new upload, so this
    // never creates a second/duplicate copy of the image.
    if (editingId) {
      onChange(
        value.map((v) =>
          v.id === editingId ? { ...v, imageUrl: img.url } : v,
        ),
      );
    } else {
      onChange([
        ...value,
        {
          id: Math.random().toString(36).slice(2, 11),
          color: colorName.trim() || pendingColor.name,
          hexCode: pendingColor.hex,
          imageUrl: img.url,
        },
      ]);
    }

    setPickerOpen(false);
    setPendingColor(null);
    setEditingId(null);
  };

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Added colors */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {value.map((entry) => (
            <div
              key={entry.id}
              className="relative group flex flex-col items-center w-24 border border-input rounded-xl overflow-visible bg-card"
            >
              <div className="w-full aspect-square bg-white border-b border-input rounded-t-xl overflow-hidden relative">
                <ImageShimmer
                  src={entry.imageUrl}
                  alt={entry.color}
                  wrapperClassName="absolute inset-0"
                />
                <button
                  type="button"
                  onClick={() => openPickerForExisting(entry)}
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white text-[11px] flex items-center justify-center"
                >
                  Change Image
                </button>
              </div>
              <div className="w-full p-2 bg-muted/20 rounded-b-xl border-t border-input flex items-center gap-1.5 justify-center">
                <span
                  className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: entry.hexCode || "#ccc" }}
                />
                <span
                  className="text-[10px] truncate font-medium text-foreground"
                  title={entry.color}
                >
                  {entry.color}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(entry.id);
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ring-2 ring-background z-10"
                title={`Remove ${entry.color}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick basic colors + custom color wheel */}
      <div className="flex items-center gap-3">
        {BASIC_COLORS.map((c) => {
          const added = !!findByHex(c.hex);
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => handleBasicColorClick(c)}
              title={added ? `Edit ${c.name}` : `Add ${c.name}`}
              className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-105"
              style={{
                backgroundColor: c.hex,
                borderColor: added ? "var(--primary)" : "var(--border)",
              }}
            />
          );
        })}
        <button
          type="button"
          onClick={() => colorInputRef.current?.click()}
          title="Custom color"
          className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={colorInputRef}
          type="color"
          className="sr-only"
          onChange={handleCustomColorChange}
        />
        <span className="text-xs text-muted-foreground">
          Pick a basic color, or use custom for anything else
        </span>
      </div>

      {/* Image picker — reuses the images already uploaded above, never a
          fresh device/gallery upload. */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-border shrink-0"
                style={{ backgroundColor: pendingColor?.hex }}
              />
              Choose image for this color
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color name</label>
              <Input
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="e.g. Black"
              />
            </div>
            {persistedProductImages.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                {productImages.length === 0
                  ? "Upload product images above first — the color image comes from that gallery."
                  : "Save the product first so these images finish uploading, then come back to assign one to a color."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {persistedProductImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleSelectImage(img)}
                    className="aspect-square rounded-lg overflow-hidden border-2 border-input hover:border-primary transition-colors"
                  >
                    <ImageShimmer
                      src={img.url}
                      alt="Product"
                      wrapperClassName="aspect-square w-full"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
