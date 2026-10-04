"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageRemoveButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Describes what's being removed, e.g. `Remove ${color}`. */
  label?: string;
  /** Reveal only on hover of the enclosing `group`. */
  revealOnHover?: boolean;
  className?: string;
}

/**
 * The remove affordance on an image thumbnail: a small circle straddling the
 * top-right corner, half on the image and half off it.
 *
 * Sitting on the corner rather than inside it keeps the button clear of the
 * thumbnail's own content — the previous full-size button sat over the middle
 * of small tiles and collided with the "Replace" overlay. The `ring-background`
 * is what separates the circle from the photo behind it.
 *
 * NOTE for callers: the button deliberately overflows its tile, so the tile
 * must NOT have `overflow-hidden`. Clip the image with an inner wrapper
 * instead, and leave at least `gap-4` between grid tiles so the overhang
 * can't reach a neighbour.
 */
export function ImageRemoveButton({
  onClick,
  label = "Remove image",
  revealOnHover = false,
  className,
}: ImageRemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "absolute -top-2 -right-2 z-30 rounded-full p-1",
        "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        "shadow-sm ring-2 ring-background transition-opacity",
        revealOnHover && "opacity-0 group-hover:opacity-100 focus:opacity-100",
        className,
      )}
    >
      <X className="h-3 w-3" />
    </button>
  );
}
