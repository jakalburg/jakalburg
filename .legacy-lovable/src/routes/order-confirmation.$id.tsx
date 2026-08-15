import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useOrderStore } from "@/stores/orders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatINR, formatDate } from "@/lib/format";

export const Route = createFileRoute("/order-confirmation/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id} — Jakalburg` },
      { name: "description", content: "Order confirmation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const order = useOrderStore((s) => s.orders.find((o) => o.id === id));

  return (
    <SiteLayout hideNewsletter>
      <section className="container-vh py-16">
        {!hydrated ? (
          <p className="text-sm text-mute-text">Loading your order…</p>
        ) : !order ? (
          <div className="mx-auto max-w-md text-center">
            <p className="eyebrow text-mute-text">Order not found</p>
            <h1 className="mt-2 text-3xl">We couldn't find that order.</h1>
            <p className="mt-3 text-sm text-mute-text">
              It may have been placed in a different browser or has expired from local storage.
            </p>
            <Button asChild className="mt-6"><Link to="/">Back to shop</Link></Button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow text-mute-text">Thank you</p>
            <h1 className="mt-2 text-3xl md:text-4xl">Your demo order is confirmed.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Order <span className="font-medium">{order.id}</span> · placed {formatDate(order.createdAt)}. A summary is below — no payment was processed.
            </p>

            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
              <div>
                <ul className="divide-y border-y">
                  {order.items.map((i) => (
                    <li key={`${i.productId}-${i.size}-${i.color}`} className="flex gap-4 py-4">
                      <img src={i.image} alt="" aria-hidden="true" className="h-24 w-20 object-cover" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{i.title}</p>
                        <p className="text-xs text-mute-text">{i.color} · {i.size} · Qty {i.quantity}</p>
                      </div>
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
              <Button asChild><Link to="/invoice/$id" params={{ id: order.id }}>View invoice</Link></Button>
              <Button asChild variant="outline"><Link to="/account/orders">View my orders</Link></Button>
              <Button asChild variant="outline"><Link to="/">Continue shopping</Link></Button>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
