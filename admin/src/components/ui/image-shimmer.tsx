"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageShimmerProps = {
  src?: string | null;
  alt?: string;
  /** Classes for the <Image> element. */
  className?: string;
  /** Classes for the wrapper box — set sizing / aspect ratio / rounding here. */
  wrapperClassName?: string;
  sizes?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain";
  /** next/image optimization. Defaults off to match existing admin usage
   *  (remote/CMS URLs that aren't whitelisted in next.config). */
  unoptimized?: boolean;
};

/**
 * Image with a shimmer placeholder while it loads.
 *
 * Shows a gray box with an animated sweep until the image loads, then cross-fades
 * it in. Falls back to a broken-image icon on error or when `src` is missing.
 * Uses next/image with `fill`, so the wrapper must own the size/aspect via
 * `wrapperClassName` (e.g. "w-12 h-12" or "aspect-square").
 *
 * Twin of the client `ImageShimmer` (that one wraps a plain <img>); keep them in
 * sync. The `shimmer` keyframe lives in src/app/globals.css.
 */
export function ImageShimmer({
  src,
  alt = "",
  className,
  wrapperClassName,
  sizes = "100%",
  priority,
  objectFit = "cover",
  unoptimized = true,
}: ImageShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showFallback = failed || !src;

  return (
    <div className={cn("relative overflow-hidden bg-muted", wrapperClassName)}>
      {!loaded && !showFallback && (
        <div
          aria-hidden
          className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent"
        />
      )}
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
        </div>
      ) : (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            objectFit === "contain" ? "object-contain" : "object-cover",
            "transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
        />
      )}
    </div>
  );
}

export default ImageShimmer;
