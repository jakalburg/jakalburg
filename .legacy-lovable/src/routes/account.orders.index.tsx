import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountShell } from "@/components/account/AccountShell";
import { useOrderStore } from "@/stores/orders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, formatINR } from "@/lib/format";

export const Route = createFileRoute("/account/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — Jakalburg" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersList,
});

function OrdersList() {
  const hydrated = useHydrated();
  const orders = useOrderStore((s) => s.orders);
  return (
    <AccountShell>
      <h2 className="text-xl">Orders</h2>
      {!hydrated ? null : orders.length === 0 ? (
        <p className="mt-4 text-sm text-mute-text">You haven't placed any orders yet.</p>
      ) : (
        <ul className="mt-6 divide-y border-y">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to="/account/orders/$id" params={{ id: o.id }} className="grid grid-cols-2 gap-4 py-5 text-sm md:grid-cols-4">
                <div>
                  <p className="eyebrow text-mute-text">Order</p>
                  <p className="mt-1 font-medium">{o.id}</p>
                </div>
                <div>
                  <p className="eyebrow text-mute-text">Placed</p>
                  <p className="mt-1">{formatDate(o.createdAt)}</p>
                </div>
                <div>
                  <p className="eyebrow text-mute-text">Status</p>
                  <p className="mt-1 capitalize">{o.status}</p>
                </div>
                <div className="text-right">
                  <p className="eyebrow text-mute-text">Total</p>
                  <p className="mt-1">{formatINR(o.total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
