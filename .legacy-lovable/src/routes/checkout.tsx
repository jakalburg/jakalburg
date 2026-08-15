import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { useHydrated } from "@/hooks/useHydrated";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Jakalburg" },
      { name: "description", content: "Demo checkout — no payment will be processed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  return (
    <SiteLayout hideNewsletter>
      <section className="container-vh py-12">
        <h1 className="mb-8 text-3xl">Checkout</h1>
        {!hydrated ? null : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 border py-16 text-center">
            <p className="text-sm text-mute-text">Your bag is empty — add something to check out.</p>
            <Button asChild><Link to="/new-arrivals">Shop new arrivals</Link></Button>
          </div>
        ) : (
          <CheckoutFlow />
        )}
      </section>
    </SiteLayout>
  );
}
