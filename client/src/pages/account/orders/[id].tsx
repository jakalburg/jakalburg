import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useOrder } from "@/hooks/useOrders";
import { useMyReviews } from "@/hooks/useReviews";
import { useHydrated } from "@/hooks/useHydrated";
import { OrderItemReview } from "@/components/reviews/OrderItemReview";
import { formatDate, formatINR } from "@/lib/format";

export default function OrderDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const hydrated = useHydrated();
  const { data: order, isLoading } = useOrder(id);
  // This order's reviews in one call, then matched to line items below —
  // cheaper than a request per item and it keeps the list fresh after a submit.
  // Scoping the request by order number bounds it to this order's line items
  // rather than the customer's entire review history.
  const { data: myReviews = [] } = useMyReviews(id);
  const ready = hydrated && router.isReady && !isLoading;

  // productId → this order's review for it. The same piece bought twice keeps
  // its two reviews on their own orders.
  const reviewByProduct = new Map(myReviews.map((r) => [r.productId, r]));

  return (
    <>
      <SEO title={`Order ${id} — Jakalburg`} noIndex />
      <SiteLayout hideNewsletter>
        <AccountShell>
          {!ready ? null : !order ? (
            <div>
              <p className="text-sm text-mute-text">Order not found.</p>
              <Button asChild variant="outline" className="mt-4"><Link href="/account/orders">Back to orders</Link></Button>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="eyebrow text-mute-text">Order {order.id}</p>
                  <h2 className="mt-1 text-2xl">Placed {formatDate(order.createdAt)}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="border px-3 py-1 text-xs capitalize">{order.status}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/invoice/${order.id}`}>View invoice</Link>
                  </Button>
                </div>
              </div>
              <div className="grid gap-8 md:grid-cols-[1fr_280px]">
                <ul className="divide-y border-y">
                  {order.items.map((i) => (
                    <li key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-4 py-4">
                      <ImageShimmer src={i.image} alt="" aria-hidden="true" wrapperClassName="h-24 w-20 shrink-0" className="object-cover" />
                      <div className="min-w-0 flex-1 text-sm">
                        <Link href={`/product/${i.slug}`} className="group block">
                          <p className="font-medium group-hover:underline">{i.title}</p>
                          <p className="text-xs text-mute-text">{i.color} · {i.size} · Qty {i.quantity}</p>
                        </Link>
                        {/* Review lives inside the item block, not the link —
                            nesting buttons in an <a> is invalid and would swallow
                            the clicks. */}
                        <OrderItemReview
                          item={i}
                          orderNumber={order.id}
                          orderStatus={order.status}
                          review={reviewByProduct.get(i.productId)}
                        />
                      </div>
                      <p className="shrink-0 text-sm">{formatINR(i.price * i.quantity)}</p>
                    </li>
                  ))}
                </ul>
                <aside className="space-y-4 text-sm">
                  <div className="border p-4">
                    <p className="eyebrow mb-2 text-mute-text">Ship to</p>
                    <p>{order.address.fullName}</p>
                    <p>{order.address.line1}</p>
                    <p>{order.address.city}, {order.address.state} {order.address.pincode}</p>
                  </div>
                  <div className="border p-4">
                    <p className="eyebrow mb-2 text-mute-text">Payment</p>
                    <p>{order.paymentLabel}</p>
                  </div>
                  <div className="border p-4">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Shipping</span><span>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</span></div>
                    <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                      <span>Total</span><span>{formatINR(order.total)}</span>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </AccountShell>
      </SiteLayout>
    </>
  );
}
