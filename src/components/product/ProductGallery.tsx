import { useState } from "react";

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid grid-cols-[80px_1fr] gap-4 md:gap-6">
      <div className="flex flex-col gap-2 overflow-y-auto">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`View image ${i + 1}`}
            onClick={() => setActive(i)}
            className={`aspect-[4/5] overflow-hidden border ${active === i ? "border-foreground" : "border-transparent"}`}
          >
            <img src={src} alt="" aria-hidden="true" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      <div className="aspect-[4/5] overflow-hidden bg-stone">
        <img src={images[active]} alt={alt} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
