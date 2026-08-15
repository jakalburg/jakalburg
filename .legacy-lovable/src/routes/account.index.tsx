import { createFileRoute, Link } from "@tanstack/react-router";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";
import { useOrderStore } from "@/stores/orders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, formatINR } from "@/lib/format";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "Account overview — Jakalburg" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountOverview,
});

function AccountOverview() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const orders = useOrderStore((s) => s.orders);
  const recent = orders.slice(0, 3);

  return (
    <AccountShell>
      {!hydrated ? null : !user ? (
        <div className="border p-6">
          <h2 className="text-xl">You're browsing as a guest</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Sign in to save addresses and keep a full order history. This is a demo — no real account is created.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild variant="outline"><Link to="/signup">Create account</Link></Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="border p-6">
            <p className="eyebrow text-mute-text">Signed in as</p>
            <p className="mt-2 text-lg font-medium">{user.name}</p>
            <p className="text-sm text-mute-text">{user.email}</p>
          </div>
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl">Recent orders</h2>
              <Link to="/account/orders" className="text-xs underline underline-offset-4">See all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-mute-text">No orders yet.</p>
            ) : (
              <ul className="divide-y border-y">
                {recent.map((o) => (
                  <li key={o.id}>
                    <Link to="/account/orders/$id" params={{ id: o.id }} className="flex items-center justify-between py-4 text-sm">
                      <div>
                        <p className="font-medium">{o.id}</p>
                        <p className="text-xs text-mute-text">{formatDate(o.createdAt)} · {o.items.length} items · {o.status}</p>
                      </div>
                      <p>{formatINR(o.total)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AccountShell>
  );
}
