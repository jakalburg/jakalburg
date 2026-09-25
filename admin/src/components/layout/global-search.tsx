"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Users, Package } from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { useCustomers } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useDebounce } from "@/hooks/use-debounce";
import { formatName } from "@/lib/utils";

const getDisplayOrderNumber = (order: any) =>
  order?.orderNumber ||
  order?.invoiceNumber ||
  (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
  order?.id?.slice(-8).toUpperCase();

/** Rows shown per group. The palette is a shortcut, not a table. */
const SEARCH_RESULT_LIMIT = 5;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  // The palette searches in the DATABASE rather than pulling the first couple
  // of hundred rows of each table and filtering them in the browser. The old
  // approach could only ever match whatever happened to land in that first
  // page, and asked for far more rows than the five it displays.
  const debouncedQuery = useDebounce(query, 300);
  const search = debouncedQuery.trim() || undefined;

  const { data: ordersData } = useOrders({
    limit: SEARCH_RESULT_LIMIT,
    search,
  });
  const { data: customersData } = useCustomers({
    limit: SEARCH_RESULT_LIMIT,
    search,
  });
  const { data: productsData } = useProducts({
    limit: SEARCH_RESULT_LIMIT,
    search,
  });

  // Every list endpoint answers with the `{ data, total, … }` envelope; orders
  // additionally mirror `data` as `items`. Reading the envelope as if it were
  // an array is what silently emptied the customers and products groups.
  const orders = (ordersData as any)?.items ?? (ordersData as any)?.data ?? [];
  const customers = customersData?.data ?? [];
  const products = productsData?.data ?? [];

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Trigger input */}
      <div
        className="relative cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          readOnly
          type="search"
          placeholder="Search"
          className="pl-10 bg-muted/50 border-muted cursor-pointer"
          onFocus={() => setOpen(true)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hidden sm:block">
          Ctrl K
        </span>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search across orders, customers and products"
        /* The server already matched these rows, so cmdk must not filter them
           again — it would drop a customer matched on a field the row doesn't
           print, and the groups would look empty for a valid query. */
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Type to search..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Orders */}
          {orders.length > 0 && (
            <CommandGroup heading="Orders">
              {orders.map((order: any) => {
                const addr = order.shippingAddress;
                const profile = order.user?.profiles?.[0];
                const rawName = addr?.firstName
                  ? `${addr.firstName} ${addr.lastName || ""}`.trim()
                  : profile
                    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
                    : order.user?.email || "Guest";
                  return (
                  <CommandItem
                    key={order.id}
                    value={`order ${getDisplayOrderNumber(order)} ${order.id.slice(-8)} ${rawName} ${order.user?.email || ""} ${order.status}`}
                    onSelect={() => navigate(`/orders/${order.id}`)}
                    className="gap-3"
                  >
                    <ShoppingCart className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono font-semibold">{getDisplayOrderNumber(order)}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{formatName(rawName)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize shrink-0">{order.status}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <CommandGroup heading="Customers">
              {customers.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={`customer ${c.name || ""} ${c.email || ""} ${c.phone || ""}`}
                  onSelect={() => navigate(`/customers`)}
                  className="gap-3"
                >
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{c.name || "Unknown"}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{c.email}</span>
                  </div>
                  {c.phone && <span className="text-xs text-muted-foreground shrink-0">{c.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Products */}
          {products.length > 0 && (
            <CommandGroup heading="Products">
              {products.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={`product ${p.name || p.title || ""}`}
                  onSelect={() => navigate(`/products/${p.id}`)}
                  className="gap-3"
                >
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{p.name || p.title}</span>
                  {p.price != null && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-auto">₹{p.price}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
