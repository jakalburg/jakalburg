import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setSearchOpen, selectUI } from "@/redux/features/ui-slice";
import { products } from "@/data/products";
import { formatINR } from "@/lib/format";

export function SearchOverlay() {
  const dispatch = useAppDispatch();
  const open = useAppSelector(selectUI).searchOpen;
  const setOpen = (v: boolean) => dispatch(setSearchOpen(v));
  const [q, setQ] = useState("");
  const router = useRouter();

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
  }, [q]);

  const goToSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    void router.push({ pathname: "/search", query: { q } });
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
                <li key={p.id}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 py-3"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="size-14 object-cover"
                      loading="lazy"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-xs text-mute-text capitalize">{p.category.replace("-", " ")}</p>
                    </div>
                    <p className="text-sm">{formatINR(p.price)}</p>
                  </Link>
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
