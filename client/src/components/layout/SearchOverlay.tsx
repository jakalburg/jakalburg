import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSearchOpen, selectUI } from "@/redux/features/ui-slice";
import { useProducts } from "@/hooks/useProducts";

export function SearchOverlay() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectUI).searchOpen;
  const setOpen = (v: boolean) => dispatch(setSearchOpen(v));
  const [q, setQ] = useState("");
  const router = useRouter();
  const { data: products = [] } = useProducts();

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.category.includes(term) ||
          p.tags.some((t) => t.includes(term)),
      )
      .slice(0, 6);
  }, [q, products]);

  // Run a search for a term — used by the form submit and by clicking a
  // suggestion row. The up-left arrow next to each row instead just writes the
  // name into the input (setQ) so the shopper can refine before searching.
  const runSearch = (term: string) => {
    const query = term.trim();
    if (!query) return;
    setOpen(false);
    void router.push({ pathname: "/search", query: { q: query } });
  };

  const goToSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(q);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[10%] translate-y-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Jakalburg</DialogTitle>
          <DialogDescription className="sr-only">Search products by name or category</DialogDescription>
        </DialogHeader>
        <form onSubmit={goToSearch} className="flex items-center gap-2 border-b pb-2">
          <Search className="size-4 text-mute-text" aria-hidden="true" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shirts, dresses, denim…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Search products"
          />
        </form>
        <div className="mt-4 max-h-80 overflow-y-auto">
          {q && results.length === 0 && (
            <p className="text-sm text-mute-text">No matches for &quot;{q}&quot;.</p>
          )}
          {results.length > 0 && (
            <ul className="divide-y">
              {results.map((p) => (
                <li key={p.id} className="flex items-center">
                  {/* Row click → run the search for this product name. */}
                  <button
                    type="button"
                    onClick={() => runSearch(p.title)}
                    className="flex flex-1 items-center gap-3 py-3 text-left"
                  >
                    <Search className="size-4 shrink-0 text-mute-text" aria-hidden="true" />
                    <span className="flex-1 text-sm">{p.title}</span>
                  </button>
                  {/* Arrow → write the name into the search box (refine, don't search yet). */}
                  <button
                    type="button"
                    onClick={() => setQ(p.title)}
                    aria-label={`Use "${p.title}" as search text`}
                    className="shrink-0 p-2 text-mute-text hover:text-foreground"
                  >
                    <ArrowUpLeft className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!q && (
            <div>
              <p className="eyebrow mb-3 text-mute-text">Popular</p>
              <ul className="flex flex-wrap gap-2">
                {["Linen", "Denim", "Knitwear", "Dresses", "Polos"].map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => setQ(t.toLowerCase())}
                      className="border border-line px-3 py-1 text-xs hover:bg-stone"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
