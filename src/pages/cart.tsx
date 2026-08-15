import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X } from "lucide-react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  itemKey,
  selectCartItems,
  selectCartSubtotal,
  remove_cart_product,
  update_cart_quantity,
} from "@/redux/features/cart-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { formatINR } from "@/lib/format";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const hydrated = useHydrated();
  const remove = (key: string) => dispatch(remove_cart_product(key));
  const update = (key: string, qty: number) => dispatch(update_cart_quantity({ key, qty }));
  const [promo, setPromo] = useState("");
  const [promoStatus, setPromoStatus] = useState<null | string>(null);

  const applyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promo.trim()) return;
    setPromoStatus("Promo codes are visual only in this demo.");
  };

  return (
    <>
      <SEO title="Your bag — Jakalburg" description="Review the items in your bag." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-12">
          <h1 className="text-3xl">Your bag</h1>
          {hydrated && items.length === 0 && (
            <div className="mt-16 flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-mute-text">Your bag is empty.</p>
              <Button asChild><Link href="/new-arrivals">Shop new arrivals</Link></Button>
            </div>
          )}
          {hydrated && items.length > 0 && (
            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
              <ul className="divide-y border-y">
                {items.map((i) => {
                  const key = itemKey(i);
                  return (
                    <li key={key} className="flex gap-4 py-6">
                      <img src={i.image} alt={i.title} className="h-36 w-28 object-cover" />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link href={`/product/${i.slug}`} className="text-sm font-medium hover:underline">
                              {i.title}
                            </Link>
                            <p className="text-xs text-mute-text">{i.color} · {i.size}</p>
                          </div>
                          <button aria-label={`Remove ${i.title}`} onClick={() => remove(key)}>
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center border">
                            <button aria-label="Decrease" className="p-2" onClick={() => update(key, i.quantity - 1)}>
                              <Minus className="size-3" aria-hidden="true" />
                            </button>
                            <span className="w-10 text-center text-sm">{i.quantity}</span>
                            <button aria-label="Increase" className="p-2" onClick={() => update(key, i.quantity + 1)}>
                              <Plus className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                          <p className="text-sm">{formatINR(i.price * i.quantity)}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="border p-5">
                  <p className="eyebrow mb-4 text-mute-text">Order summary</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                    <div className="flex justify-between text-mute-text"><span>Shipping</span><span>Calculated at checkout</span></div>
                  </div>
                  <form onSubmit={applyPromo} className="mt-6 flex gap-2">
                    <Input placeholder="Promo code" value={promo} onChange={(e) => setPromo(e.target.value)} aria-label="Promo code" />
                    <Button type="submit" variant="outline">Apply</Button>
                  </form>
                  {promoStatus && <p className="mt-2 text-xs text-mute-text">{promoStatus}</p>}
                  <Separator className="my-4" />
                  <div className="flex justify-between text-base font-medium">
                    <span>Estimated total</span><span>{formatINR(subtotal)}</span>
                  </div>
                  <Button asChild size="lg" className="mt-6 w-full">
                    <Link href="/checkout">Checkout</Link>
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </section>
      </SiteLayout>
    </>
  );
}
