import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Stars.
//
// Filled stars are the conventional rating gold (amber-500), matching the admin
// dashboard's review table so a rating reads the same on both sides. Empty stars
// stay a muted outline rather than a washed-out gold, so the filled count is
// legible at the 12px size used on product cards.
// ---------------------------------------------------------------------------

/** Shared so the display and input stars can never drift apart. */
const FILLED = "text-amber-500";
const EMPTY = "text-mute-text/40";

const SIZES = {
  sm: "size-3",
  md: "size-4",
  lg: "size-6",
} as const;

/** Read-only rating. Fractional values fill partial stars via a clipped overlay,
 *  so a 4.6 average looks like 4.6 rather than rounding to 5. */
export function StarRating({
  value,
  size = "sm",
  className,
}: {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const glyph = SIZES[size];
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        // How much of THIS star is filled: 0 → empty, 1 → solid, between → split.
        const fill = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className={cn("relative block", glyph)} aria-hidden="true">
            <Star className={cn(glyph, "absolute inset-0", EMPTY)} style={{ fill: "none" }} />
            {fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={cn(glyph, FILLED)} style={{ fill: "currentColor" }} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** The star picker in the review form. Keyboard-operable as a radio group:
 *  arrow keys move between stars, so it isn't mouse-only. */
export function StarRatingInput({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  // Preview the rating the pointer is over without committing it.
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          disabled={disabled}
          // Only the selected star (or the first, before anything is picked)
          // sits in the tab order — arrow keys move within the group.
          tabIndex={star === (value || 1) ? 0 : -1}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(Math.min(5, (value || 0) + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.max(1, (value || 1) - 1));
            }
          }}
          className="p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
        >
          <Star
            className={cn(
              "size-7 transition-colors",
              star <= shown ? FILLED : EMPTY,
            )}
            style={{ fill: star <= shown ? "currentColor" : "none" }}
          />
        </button>
      ))}
    </div>
  );
}

/** Compact "★★★★☆ 4.6 (23)" line for cards and the product title block.
 *  Renders nothing when a product has no approved reviews — an empty star row
 *  on every new product would read as a zero score rather than "no data yet". */
export function RatingSummary({
  average,
  count,
  size = "sm",
  className,
}: {
  average?: number;
  count?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <StarRating value={average ?? 0} size={size} />
      <span className="text-mute-text">
        {(average ?? 0).toFixed(1)} ({count})
      </span>
    </span>
  );
}
