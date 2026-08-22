import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { AccountShell } from "@/components/account/AccountShell";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/redux/hooks";
import { selectAuthUser } from "@/redux/features/auth-slice";
import { useOrders } from "@/hooks/useOrders";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, formatINR } from "@/lib/format";

export default function AccountOverview() {
  const hydrated = useHydrated();
  const user = useAppSelector(selectAuthUser);
  const { data: orders = [] } = useOrders();
  const recent = orders.slice(0, 3);

  return (
    <>
      <SEO title="Account overview — Jakalburg" noIndex />
      <SiteLayout hideNewsletter>
        <AccountShell>
          {!hydrated ? null : !user ? (
            <div className="border p-6">
              <h2 className="text-xl">You&apos;re browsing as a guest</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Sign in to save addresses and keep a full order history. This is a demo — no real account is created.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild><Link href="/login">Sign in</Link></Button>
                <Button asChild variant="outline"><Link href="/signup">Create account</Link></Button>
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
                  <Link href="/account/orders" className="text-xs underline underline-offset-4">See all</Link>
                </div>
                {recent.length === 0 ? (
                  <p className="text-sm text-mute-text">No orders yet.</p>
                ) : (
                  <ul className="divide-y border-y">
                    {recent.map((o) => (
                      <li key={o.id}>
                        <Link href={`/account/orders/${o.id}`} className="flex items-center justify-between py-4 text-sm">
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
      </SiteLayout>
    </>
  );
}
