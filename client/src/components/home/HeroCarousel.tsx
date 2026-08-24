import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { HeroSlide } from "@/hooks/useHeroSlides";

// Auto-advance interval for multi-slide heroes.
const AUTOPLAY_MS = 6000;

/**
 * The storefront hero — a full-bleed carousel of admin-managed slides. It is
 * image-first: each slide is just a background image (or video) that links
 * somewhere; any headline/CTA is baked into the marketing image itself, so
 * there is no text overlay. A slide can carry a distinct mobile image/video
 * (shown below `md`, falling back to the desktop media when absent).
 *
 * Single-slide heroes render statically (no dots / autoplay). The parent only
 * mounts this when at least one slide exists; otherwise it shows the static hero.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const multiple = slides.length > 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !multiple) return;
    const id = window.setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [api, multiple]);

  return (
    <section className="relative">
      <Carousel setApi={setApi} opts={{ loop: multiple }} className="w-full">
        <CarouselContent className="ml-0">
          {slides.map((slide) => {
            const hasMobileMedia = Boolean(slide.mobileVideo || slide.mobileImage);

            return (
              <CarouselItem key={slide.id} className="pl-0">
                <Link
                  href={slide.link || "/"}
                  className="block h-[70vh] w-full md:h-[80vh]"
                  aria-label="Hero slide"
                >
                  {/* Desktop media (also the mobile fallback when no mobile media). */}
                  <div
                    className={cn(
                      "relative h-full w-full",
                      hasMobileMedia && "hidden md:block",
                    )}
                  >
                    {slide.video ? (
                      <video
                        src={slide.video}
                        className="absolute inset-0 h-full w-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <ImageShimmer
                        src={slide.image}
                        alt="Hero slide"
                        wrapperClassName="absolute inset-0 h-full w-full"
                        className="object-cover"
                        loading="eager"
                      />
                    )}
                  </div>

                  {/* Distinct mobile media, only below `md`. */}
                  {hasMobileMedia && (
                    <div className="relative h-full w-full md:hidden">
                      {slide.mobileVideo ? (
                        <video
                          src={slide.mobileVideo}
                          className="absolute inset-0 h-full w-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <ImageShimmer
                          src={slide.mobileImage || slide.image}
                          alt="Hero slide"
                          wrapperClassName="absolute inset-0 h-full w-full"
                          className="object-cover"
                          loading="eager"
                        />
                      )}
                    </div>
                  )}
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {multiple && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => api?.scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selected}
              className={cn(
                "h-2 rounded-full bg-white/50 transition-all",
                i === selected ? "w-6 bg-white" : "w-2 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HeroCarousel;
