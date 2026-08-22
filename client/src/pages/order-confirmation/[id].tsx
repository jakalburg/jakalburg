import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { PageLoader } from "@/components/ui/loader";
import { useOrder } from "@/hooks/useOrders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatINR, formatDate } from "@/lib/format";

export default function ConfirmationPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const hydrated = useHydrated();
  const { data: order, isLoading } = useOrder(id);
  const ready = hydrated && router.isReady && !isLoading;

  return (
    <>
      <SEO title={`Order ${id} — Jakalburg`} description="Order confirmation." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-16">
          {!ready ? (
            <PageLoader />
          ) : !order ? (
            <div className="mx-auto max-w-md text-center">
              <p className="eyebrow text-mute-text">Order not found</p>
              <h1 className="mt-2 text-3xl">We couldn&apos;t find that order.</h1>
              <p className="mt-3 text-sm text-mute-text">
                It may belong to a different account, or you may need to sign in to view it.
              </p>
              <Button asChild className="mt-6"><Link href="/">Back to shop</Link></Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <p className="eyebrow text-mute-text">Thank you</p>
              <h1 className="mt-2 text-3xl md:text-4xl">Your order is confirmed.</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Order <span className="font-medium">{order.id}</span> · placed {formatDate(order.createdAt)}. A summary is below — no payment was processed.
              </p>

              <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
                <div>
                  <ul className="divide-y border-y">
                    {order.items.map((i) => (
                      <li key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-4 py-4">
                        <Link href={`/product/${i.slug}`} className="group flex flex-1 gap-4">
                          <ImageShimmer src={i.image} alt="" aria-hidden="true" wrapperClassName="h-24 w-20" className="object-cover" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium group-hover:underline">{i.title}</p>
                            <p className="text-xs text-mute-text">{i.color} · {i.size} · Qty {i.quantity}</p>
                          </div>
                        </Link>
                        <p className="text-sm">{formatINR(i.price * i.quantity)}</p>
                      </li>
                    ))}
                  </ul>
                </div>

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

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild><Link href={`/invoice/${order.id}`}>View invoice</Link></Button>
                <Button asChild variant="outline"><Link href="/account/orders">View my orders</Link></Button>
                <Button asChild variant="outline"><Link href="/">Continue shopping</Link></Button>
              </div>
            </div>
          )}
        </section>
      </SiteLayout>
    </>
  );
}
