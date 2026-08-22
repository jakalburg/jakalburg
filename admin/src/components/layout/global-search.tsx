"use client";

import { useState, useEffect, useMemo } from "react";
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
import { formatName } from "@/lib/utils";

const getDisplayOrderNumber = (order: any) =>
  order?.orderNumber ||
  order?.invoiceNumber ||
  (order?.invoiceSequence ? String(order.invoiceSequence).padStart(2, "0") : "") ||
  order?.id?.slice(-8).toUpperCase();

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: ordersData } = useOrders({ limit: 200 });
  const { data: customers = [] } = useCustomers();
  const { data: productsData } = useProducts({ limit: 100 });

  const orders = (ordersData as any)?.items || [];
  const products = (productsData as any)?.items || (productsData as any) || [];

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

      <CommandDialog open={open} onOpenChange={setOpen} title="Global Search" description="Search across orders, customers and products">
        <CommandInput placeholder="Type to search..." />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Orders */}
          {orders.length > 0 && (
            <CommandGroup heading="Orders">
              {orders.slice(0, 5).map((order: any) => {
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
          {(customers as any[]).length > 0 && (
            <CommandGroup heading="Customers">
              {(customers as any[]).slice(0, 5).map((c: any) => (
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
          {(Array.isArray(products) ? products : []).length > 0 && (
            <CommandGroup heading="Products">
              {(Array.isArray(products) ? products : []).slice(0, 5).map((p: any) => (
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
