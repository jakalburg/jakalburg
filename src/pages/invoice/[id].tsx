import Link from "next/link";
import { useRouter } from "next/router";
import { Printer } from "lucide-react";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/redux/hooks";
import { selectOrderById } from "@/redux/features/orders-slice";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDate, formatINR } from "@/lib/format";

export default function InvoicePage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const hydrated = useHydrated();
  const order = useAppSelector(selectOrderById(id));
  const ready = hydrated && router.isReady;

  return (
    <>
      <SEO title={`Invoice ${id} — Jakalburg`} description="Order invoice." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-12">
          {!ready ? null : !order ? (
            <div className="mx-auto max-w-md text-center">
              <p className="eyebrow text-mute-text">Invoice unavailable</p>
              <h1 className="mt-2 text-3xl">We couldn&apos;t find that order.</h1>
              <Button asChild className="mt-6"><Link href="/account/orders">Back to orders</Link></Button>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex items-center justify-between print:hidden">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/account/orders/${order.id}`}>← Back to order</Link>
                </Button>
                <Button size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 size-4" aria-hidden="true" /> Print / Save PDF
                </Button>
              </div>

              <article className="border bg-card p-8 md:p-10">
                <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-8">
                  <div>
                    <img src="/logo.png" alt="Jakalburg" className="h-16 w-auto mix-blend-multiply" />
                    <p className="mt-3 text-xs text-mute-text">
                      Jakalburg Apparel Pvt. Ltd.<br />
                      12 Atelier Lane, Bandra West<br />
                      Mumbai, Maharashtra 400050<br />
                      care@jakalburg.com
                    </p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-2xl tracking-[0.2em]">INVOICE</h1>
                    <dl className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-end gap-3">
                        <dt className="text-mute-text">Invoice no.</dt>
                        <dd className="font-medium">INV-{order.id.replace(/^JB-|^VH-/, "")}</dd>
                      </div>
                      <div className="flex justify-end gap-3">
                        <dt className="text-mute-text">Order</dt>
                        <dd className="font-medium">{order.id}</dd>
                      </div>
                      <div className="flex justify-end gap-3">
                        <dt className="text-mute-text">Date</dt>
                        <dd className="font-medium">{formatDate(order.createdAt)}</dd>
                      </div>
                      <div className="flex justify-end gap-3">
                        <dt className="text-mute-text">Status</dt>
                        <dd className="font-medium capitalize">{order.status}</dd>
                      </div>
                    </dl>
                  </div>
                </header>

                <div className="grid gap-8 border-b py-8 text-sm sm:grid-cols-2">
                  <div>
                    <p className="eyebrow mb-2 text-mute-text">Billed to</p>
                    <p className="font-medium">{order.address.fullName}</p>
                    <p>{order.address.line1}</p>
                    {order.address.line2 && <p>{order.address.line2}</p>}
                    <p>{order.address.city}, {order.address.state} {order.address.pincode}</p>
                    <p>{order.address.phone}</p>
                    <p className="text-mute-text">{order.email}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="eyebrow mb-2 text-mute-text">Payment</p>
                    <p>{order.paymentLabel}</p>
                    <p className="mt-3 eyebrow text-mute-text">Amount due</p>
                    <p className="text-lg">{formatINR(0)}</p>
                  </div>
                </div>

                <table className="w-full border-b py-4 text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-3 font-medium">Item</th>
                      <th className="py-3 text-center font-medium">Qty</th>
                      <th className="py-3 text-right font-medium">Price</th>
                      <th className="py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((i) => (
                      <tr key={`${i.productId}-${i.size}-${i.color}`}>
                        <td className="py-3">
                          <p className="font-medium">{i.title}</p>
                          <p className="text-xs text-mute-text">{i.color} · Size {i.size}</p>
                        </td>
                        <td className="py-3 text-center">{i.quantity}</td>
                        <td className="py-3 text-right">{formatINR(i.price)}</td>
                        <td className="py-3 text-right">{formatINR(i.price * i.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-6">
                  <dl className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
                    <div className="flex justify-between">
                      <dt>Shipping</dt><dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between"><dt>Discount</dt><dd>−{formatINR(order.discount)}</dd></div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-base font-medium">
                      <dt>Total</dt><dd>{formatINR(order.total)}</dd>
                    </div>
                  </dl>
                </div>

                <footer className="mt-10 border-t pt-6 text-xs text-mute-text">
                  <p>All prices are in INR and inclusive of applicable taxes.</p>
                  <p className="mt-1">This is a demo invoice generated for a sample order — no payment was processed.</p>
                  <p className="mt-3">Thank you for shopping with Jakalburg.</p>
                </footer>
              </article>
            </div>
          )}
        </section>
      </SiteLayout>
    </>
  );
}
