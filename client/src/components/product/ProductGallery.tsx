import { useEffect, useRef, useState } from "react";
import { ZoomIn, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageShimmer } from "@/components/ui/image-shimmer";

// Desktop thumbnail geometry — used to work out how many thumbnails fit beside
// the main image before we collapse the overflow into a "+N" tile.
const THUMB_PX = 80; // thumbnail column width (matches grid-cols-[80px_1fr])
const THUMB_H = (THUMB_PX * 5) / 4; // thumbnails are aspect-[4/5]
const THUMB_GAP = 8; // gap-2

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  // `active` is shared: mobile (swipe/dots) and desktop (thumbnail click) never
  // show at once, and the zoom overlay uses whichever image is current.
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  return (
    <>
      <MobileGallery
        images={images}
        alt={alt}
        active={active}
        setActive={setActive}
        onZoom={() => setZoomOpen(true)}
      />
      <DesktopGallery
        images={images}
        alt={alt}
        active={active}
        setActive={setActive}
        onZoom={() => setZoomOpen(true)}
      />
      {zoomOpen && (
        <Lightbox
          images={images}
          startIndex={active}
          alt={alt}
          onClose={(i) => {
            setActive(i);
            setZoomOpen(false);
          }}
        />
      )}
    </>
  );
}

interface ViewProps {
  images: string[];
  alt: string;
  active: number;
  setActive: (i: number) => void;
}

// Mobile: a native scroll-snap carousel (real swipe, no library) with a
// position counter, tappable dots, and a zoom button — matching the reference.
function MobileGallery({
  images,
  alt,
  active,
  setActive,
  onZoom,
}: ViewProps & { onZoom: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  };

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };

  // Follow `active` when it changes from outside (e.g. closing the fullscreen
  // viewer on a different image). Guarded so it never fights the swipe handler.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.round(el.scrollLeft / el.clientWidth) !== active) {
      el.scrollTo({ left: active * el.clientWidth, behavior: "smooth" });
    }
  }, [active]);

  return (
    <div className="relative md:hidden">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <ImageShimmer
            key={i}
            src={src}
            alt={i === 0 ? alt : ""}
            aria-hidden={i !== 0}
            wrapperClassName="aspect-[4/5] w-full flex-none snap-start"
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Zoom image"
        onClick={onZoom}
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </button>

      {images.length > 1 && (
        <>
          <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-xs tabular-nums text-white">
            {active + 1} / {images.length}
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={active === i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    active === i ? "bg-white" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Desktop: unchanged thumbnail-column + main-image layout, except the thumbnail
// strip is capped to what fits beside the main image; any remainder collapses
// into a "+N" tile that expands the full strip on click.
function DesktopGallery({
  images,
  alt,
  active,
  setActive,
  onZoom,
}: ViewProps & { onZoom: () => void }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [maxThumbs, setMaxThumbs] = useState(images.length);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const compute = () => {
      const fit = Math.max(
        2,
        Math.floor((el.clientHeight + THUMB_GAP) / (THUMB_H + THUMB_GAP)),
      );
      setMaxThumbs(fit);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const overflow = !showAll && images.length > maxThumbs;
  // When capped, reserve the last visible slot for the "+N" tile.
  const visible = overflow ? images.slice(0, maxThumbs - 1) : images;
  const moreCount = images.length - visible.length;

  return (
    <div className="hidden grid-cols-[80px_1fr] gap-4 md:grid md:gap-6">
      <div className={cn("flex flex-col gap-2", showAll && "overflow-y-auto")}>
        {visible.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`View image ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "aspect-[4/5] overflow-hidden border",
              active === i ? "border-foreground" : "border-transparent",
            )}
          >
            <ImageShimmer
              src={src}
              alt=""
              aria-hidden="true"
              wrapperClassName="h-full w-full"
            />
          </button>
        ))}
        {overflow && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-label={`Show ${moreCount} more images`}
            className="relative aspect-[4/5] overflow-hidden border border-transparent"
          >
            <ImageShimmer
              src={images[visible.length]}
              alt=""
              aria-hidden="true"
              wrapperClassName="h-full w-full"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-sm font-medium text-background">
              +{moreCount}
            </span>
          </button>
        )}
      </div>
      <div ref={mainRef} className="relative aspect-[4/5] overflow-hidden bg-stone">
        <ImageShimmer
          src={images[active]}
          alt={alt}
          wrapperClassName="h-full w-full"
          loading="eager"
        />
        <button
          type="button"
          aria-label="Zoom image"
          onClick={onZoom}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background"
        >
          <ZoomIn className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// Fullscreen zoom overlay — a swipeable carousel opened from the mobile zoom
// button. Swipe left/right to move between images; Escape / close button exits.
function Lightbox({
  images,
  startIndex,
  alt,
  onClose,
}: {
  images: string[];
  startIndex: number;
  alt: string;
  onClose: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(startIndex);

  // Open on the image the user tapped (no animation).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [startIndex]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, images.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  };

  // Escape closes; arrow keys page through (for mouse/keyboard on desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(index);
      else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, index]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-lg"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => onClose(index)}
        className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="absolute left-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-opacity hover:bg-white/25 disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => goTo(index + 1)}
            disabled={index === images.length - 1}
            className="absolute right-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-opacity hover:bg-white/25 disabled:opacity-30 md:flex"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="flex h-full w-full flex-none snap-start items-center justify-center p-4"
          >
            <img
              src={src}
              alt={i === startIndex ? alt : ""}
              aria-hidden={i !== startIndex}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <div className="absolute bottom-4 left-4 rounded-full bg-black/50 px-2.5 py-1 text-xs tabular-nums text-white">
            {index + 1} / {images.length}
          </div>
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={index === i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    index === i ? "bg-white" : "bg-white/40",
                  )}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
