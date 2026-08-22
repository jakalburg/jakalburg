import { cn } from "@/lib/utils";

interface Props {
  sizes: string[];
  soldOut?: string[];
  value: string | null;
  onChange: (s: string) => void;
}

export function SizeSelector({ sizes, soldOut = [], value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((s) => {
        const disabled = soldOut.includes(s);
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            aria-pressed={value === s}
            className={cn(
              "min-w-11 border px-3 py-2 text-sm",
              value === s ? "border-foreground bg-foreground text-primary-foreground" : "border-line hover:border-foreground",
              disabled && "cursor-not-allowed opacity-40 line-through hover:border-line",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
