import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { useOrderStore } from "@/stores/orders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, formatINR } from "@/lib/format";

export const Route = createFileRoute("/account/orders/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.id} — Jakalburg` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const hydrated = useHydrated();
  const order = useOrderStore((s) => s.orders.find((o) => o.id === id));
  return (
    <AccountShell>
      {!hydrated ? null : !order ? (
        <div>
          <p className="text-sm text-mute-text">Order not found.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/account/orders">Back to orders</Link></Button>
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
                <Link to="/invoice/$id" params={{ id: order.id }}>View invoice</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-8 md:grid-cols-[1fr_280px]">
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
  );
}
