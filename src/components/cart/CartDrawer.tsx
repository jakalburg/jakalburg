import Link from "next/link";
import { useRouter } from "next/router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setCartOpen, selectUI } from "@/redux/features/ui-slice";
import {
  itemKey,
  selectCartItems,
  selectCartSubtotal,
  remove_cart_product,
  update_cart_quantity,
} from "@/redux/features/cart-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { formatINR } from "@/lib/format";
import { Minus, Plus, X } from "lucide-react";

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const open = useAppSelector(selectUI).cartOpen;
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const hydrated = useHydrated();

  const setOpen = (v: boolean) => dispatch(setCartOpen(v));
  const remove = (key: string) => dispatch(remove_cart_product(key));
  const update = (key: string, qty: number) => dispatch(update_cart_quantity({ key, qty }));

  const goCheckout = () => {
    setOpen(false);
    void router.push("/checkout");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your bag</SheetTitle>
          <SheetDescription>
            {hydrated ? `${items.length} ${items.length === 1 ? "item" : "items"}` : " "}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          {!hydrated ? null : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-mute-text">Your bag is empty.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/new-arrivals" onClick={() => setOpen(false)}>Shop new arrivals</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((i) => {
                const key = itemKey(i);
                return (
                  <li key={key} className="flex gap-3 py-4">
                    <img src={i.image} alt={i.title} className="h-24 w-20 object-cover" />
                    <div className="flex-1">
                      <Link
                        href={`/product/${i.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm font-medium hover:underline"
                      >
                        {i.title}
                      </Link>
                      <p className="text-xs text-mute-text">
                        {i.color} · {i.size}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center border">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            className="p-1"
                            onClick={() => update(key, i.quantity - 1)}
                          >
                            <Minus className="size-3" aria-hidden="true" />
                          </button>
                          <span className="w-8 text-center text-sm">{i.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            className="p-1"
                            onClick={() => update(key, i.quantity + 1)}
                          >
                            <Plus className="size-3" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="text-sm">{formatINR(i.price * i.quantity)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${i.title}`}
                      onClick={() => remove(key)}
                      className="text-mute-text hover:text-foreground"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {hydrated && items.length > 0 && (
          <SheetFooter className="border-t pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatINR(subtotal)}</span>
              </div>
              <p className="text-xs text-mute-text">Shipping and taxes calculated at checkout.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild>
                  <Link href="/cart" onClick={() => setOpen(false)}>View bag</Link>
                </Button>
                <Button onClick={goCheckout}>Checkout</Button>
              </div>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
