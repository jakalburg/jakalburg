import { useMemo } from "react";
import { useRouter } from "next/router";
import type { Product } from "@/types";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { SlidersHorizontal } from "lucide-react";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface CollectionSearch {
  size?: string;
  color?: string;
  sort?: SortKey;
}

interface Props {
  title: string;
  eyebrow?: string;
  description?: string;
  products: Product[];
  isLoading?: boolean;
}

const sortLabels: Record<SortKey, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

export function CollectionView({ title, eyebrow, description, products, isLoading }: Props) {
  const router = useRouter();
  const search: CollectionSearch = {
    size: typeof router.query.size === "string" ? router.query.size : undefined,
    color: typeof router.query.color === "string" ? router.query.color : undefined,
    sort: typeof router.query.sort === "string" ? (router.query.sort as SortKey) : undefined,
  };

  const allSizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.sizes))),
    [products],
  );
  const allColors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.colors.map((c) => c.name)))),
    [products],
  );

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.size) list = list.filter((p) => p.sizes.includes(search.size!));
    if (search.color)
      list = list.filter((p) => p.colors.some((c) => c.name === search.color));
    switch (search.sort) {
      case "newest":
        list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
        break;
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
    }
    return list;
  }, [products, search.size, search.color, search.sort]);

  const update = (patch: Partial<CollectionSearch>) => {
    const next: Record<string, string | string[] | undefined> = { ...router.query, ...patch };
    (["size", "color", "sort"] as const).forEach((k) => {
      if (!next[k]) delete next[k];
    });
    void router.push({ pathname: router.pathname, query: next }, undefined, { shallow: true });
  };

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3 text-mute-text">Size</p>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ size: search.size === s ? undefined : s })}
              aria-pressed={search.size === s}
              className={`min-w-10 border px-3 py-1.5 text-sm ${
                search.size === s ? "border-foreground bg-foreground text-primary-foreground" : "border-line"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="eyebrow mb-3 text-mute-text">Colour</p>
        <div className="space-y-2">
          {allColors.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={search.color === c}
                onCheckedChange={(v) => update({ color: v ? c : undefined })}
                aria-label={c}
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      {(search.size || search.color) && (
        <Button variant="outline" size="sm" onClick={() => update({ size: undefined, color: undefined })}>
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <section className="container-vh py-10">
      <header className="mb-8">
        {eyebrow && <p className="eyebrow text-mute-text">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </header>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs text-mute-text">
          {isLoading
            ? "Loading…"
            : `${filtered.length} ${filtered.length === 1 ? "piece" : "pieces"}`}
        </p>
        <div className="flex items-center gap-2">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">{filters}</div>
              </SheetContent>
            </Sheet>
          </div>
          <Select
            value={search.sort ?? "featured"}
            onValueChange={(v) => update({ sort: v as SortKey })}
          >
            <SelectTrigger className="w-[180px]" aria-label="Sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{sortLabels[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>
        <ProductGrid products={filtered} isLoading={isLoading} paginate />
      </div>
    </section>
  );
}
