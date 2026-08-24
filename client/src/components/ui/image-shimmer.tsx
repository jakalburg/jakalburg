import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageShimmerProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
  /** Classes for the wrapper box — set sizing / aspect ratio / rounding here. */
  wrapperClassName?: string;
};

/**
 * Image with a shimmer placeholder while it loads.
 *
 * Shows a gray box with an animated sweep until the image's `onLoad` fires, then
 * cross-fades the image in. Falls back to a broken-image icon on error or when
 * `src` is missing. The wrapper owns size/aspect via `wrapperClassName`; the
 * <img> fills it with `object-cover` by default.
 *
 * Twin of the admin `ImageShimmer` (that one wraps next/image); keep them in
 * sync. The `shimmer` keyframe lives in src/styles/index.css.
 */
export function ImageShimmer({
  src,
  alt = "",
  className,
  wrapperClassName,
  loading = "lazy",
  onLoad,
  onError,
  ...rest
}: ImageShimmerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const showFallback = failed || !src;

  // If the image finishes loading before React attaches `onLoad` — common for
  // cached images and after SSR hydration — the event is missed and the <img>
  // would stay at opacity-0 forever. Reconcile against the DOM after mount (and
  // whenever `src` changes): `complete` + `naturalWidth` reveal the real state.
  useEffect(() => {
    if (!src) return;
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-stone", wrapperClassName)}>
      {!loaded && !showFallback && (
        <div
          aria-hidden
          className="absolute inset-0 animate-[shimmer_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent bg-[length:200%_100%]"
        />
      )}
      {showFallback ? (
        <div className="absolute inset-0 flex items-center justify-center text-mute-text">
          <ImageOff className="size-6" aria-hidden />
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src as string}
          alt={alt}
          loading={loading}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setFailed(true);
            onError?.(e);
          }}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          {...rest}
        />
      )}
    </div>
  );
}

export default ImageShimmer;
