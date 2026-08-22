import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { sizeGuide } from "@/data/sizeGuide";

export function SizeGuide({ kind }: { kind: "tops" | "bottoms" }) {
  const table = sizeGuide[kind];
  return (
    <Sheet>
      <SheetTrigger className="text-xs underline underline-offset-4 text-mute-text">
        Size guide
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Size guide</SheetTitle>
          <SheetDescription>{table.label}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {table.columns.map((c) => (
                  <th key={c} className="py-2 text-left font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r[0]} className="border-b">
                  {r.map((cell, i) => (
                    <td key={i} className="py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-mute-text">
            Measurements are of the garment laid flat. Sizes may vary slightly between styles.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
