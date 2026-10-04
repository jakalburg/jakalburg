"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageRemoveButton } from "@/components/ui/image-remove-button";

// A product image is either an already-hosted URL (existing products / prior
// uploads) or a locally-picked File uploaded to Cloudinary only when the form
// is saved. Lives here because this component is what reorders and removes
// them; product-form.tsx and color-variant-card.tsx share the same shape.
export type ImageItem =
  | { kind: "url"; url: string }
  | { kind: "file"; file: File; preview: string };

interface Props {
  images: ImageItem[];
  /** Receives the reordered/filtered list. Blob cleanup is handled here. */
  onChange: (next: ImageItem[]) => void;
  /** `md` for the product gallery, `sm` for the denser per-colour strip. */
  size?: "sm" | "md";
  disabled?: boolean;
}

const SIZES = {
  sm: { tile: "h-20 w-20", control: "h-6 w-6", icon: "h-3.5 w-3.5" },
  md: { tile: "h-28 w-28", control: "h-7 w-7", icon: "h-4 w-4" },
} as const;

/**
 * An orderable strip of product images.
 *
 * **Image order IS the display order everywhere — `images[0]` is the primary /
 * thumbnail.** So reordering is not a cosmetic nicety: it's how an admin picks
 * which photo the storefront leads with.
 *
 * Three ways to reorder, deliberately: drag (fastest on desktop), the ◀ ▶
 * buttons and ★ (the only ones that work on touch, where HTML5 drag-and-drop
 * never fires).
 *
 * Shared by the product-level gallery and the per-colour strip so the two can't
 * drift — they hold the same `ImageItem[]` and mean the same thing by order.
 */
export function ImageItemGallery({
  images,
  onChange,
  size = "md",
  disabled = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const s = SIZES[size];

  const moveImage = (from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= images.length ||
      to >= images.length
    ) {
      return;
    }
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const removeImage = (i: number) => {
    const target = images[i];
    // Release the object URL now; once it's out of the list nothing else can.
    if (target?.kind === "file") URL.revokeObjectURL(target.preview);
    onChange(images.filter((_, idx) => idx !== i));
  };

  if (images.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap", size === "md" ? "gap-3" : "gap-2")}>
      {images.map((img, i) => {
        const src = img.kind === "url" ? img.url : img.preview;
        const isPrimary = i === 0;
        const isLast = i === images.length - 1;

        return (
          <div
            key={i}
            draggable={!disabled}
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
              // No `overflow-hidden`: the remove button straddles the corner.
              "group relative shrink-0 rounded-md border bg-muted transition",
              s.tile,
              !disabled && "cursor-grab active:cursor-grabbing",
              dragIndex === i && "opacity-50",
              dragOverIndex === i &&
                dragIndex !== i &&
                "ring-2 ring-primary ring-offset-1",
            )}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
              {src.trim() ? (
                // `pointer-events-none` is load-bearing: the image covers the
                // whole tile, and a child that swallows the mousedown stops the
                // draggable parent from ever starting a drag.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none h-full w-full select-none object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className={s.icon} />
                </div>
              )}

              {/* Position (1-based); the primary photo is always #1. */}
              <span className="absolute left-1 top-1 z-20 rounded bg-background/90 px-1.5 text-[10px] font-semibold text-foreground shadow ring-1 ring-black/10">
                {i + 1}
              </span>

              {/* Reorder / set-primary controls. The backdrop is
                  pointer-events-none so a drag still starts anywhere on the
                  tile; each button re-enables pointer events. Shown on hover
                  (desktop) and always on touch, where drag never fires. */}
              {!disabled && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1 bg-black/45 opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => moveImage(i, i - 1)}
                    disabled={isPrimary}
                    aria-label="Move left"
                    title="Move left"
                    className={cn(
                      "pointer-events-auto flex items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40",
                      s.control,
                    )}
                  >
                    <ChevronLeft className={s.icon} />
                  </button>
                  {!isPrimary && (
                    <button
                      type="button"
                      draggable={false}
                      onClick={() => moveImage(i, 0)}
                      aria-label="Set as primary"
                      title="Set as primary"
                      className={cn(
                        "pointer-events-auto flex items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground",
                        s.control,
                      )}
                    >
                      <Star className={s.icon} />
                    </button>
                  )}
                  <button
                    type="button"
                    draggable={false}
                    onClick={() => moveImage(i, i + 1)}
                    disabled={isLast}
                    aria-label="Move right"
                    title="Move right"
                    className={cn(
                      "pointer-events-auto flex items-center justify-center rounded-full bg-background/95 text-foreground shadow ring-1 ring-black/10 transition hover:bg-primary hover:text-primary-foreground disabled:opacity-40",
                      s.control,
                    )}
                  >
                    <ChevronRight className={s.icon} />
                  </button>
                </div>
              )}

              {/* Not yet uploaded — these go to Cloudinary on save. */}
              {img.kind === "file" && (
                <span className="absolute bottom-1 left-1 z-20 rounded bg-amber-500/90 px-1 text-[9px] font-medium text-white">
                  Pending
                </span>
              )}

              {isPrimary && (
                <span className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 rounded bg-primary/90 px-1 text-[9px] font-medium text-primary-foreground">
                  <Star className="h-2.5 w-2.5 fill-current" /> Primary
                </span>
              )}
            </div>

            {!disabled && (
              <ImageRemoveButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeImage(i);
                }}
                label="Remove image"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
