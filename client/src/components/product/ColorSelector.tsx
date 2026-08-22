import type { ProductColor } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  colors: ProductColor[];
  value: string;
  onChange: (name: string) => void;
}

export function ColorSelector({ colors, value, onChange }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow text-mute-text">Colour</p>
        <p className="text-xs text-mute-text">{value}</p>
      </div>
      <div className="flex gap-2">
        {colors.map((c) => (
          <button
            key={c.name}
            type="button"
            aria-label={`Select ${c.name}`}
            onClick={() => onChange(c.name)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border p-0.5",
              value === c.name ? "border-foreground" : "border-transparent",
            )}
          >
            <span
              className="block size-full rounded-full border border-line"
              style={{ backgroundColor: c.hex }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
