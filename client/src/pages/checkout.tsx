import Link from "next/link";
import SEO from "@/components/seo";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/redux/hooks";
import { selectCartItems } from "@/redux/features/cart-slice";
import { selectIsAuthenticated } from "@/redux/features/auth-slice";
import { useHydrated } from "@/hooks/useHydrated";

export default function CheckoutPage() {
  const hydrated = useHydrated();
  const items = useAppSelector(selectCartItems);
  const isAuth = useAppSelector(selectIsAuthenticated);
  return (
    <>
      <SEO title="Checkout — Jakalburg" description="Demo checkout — no payment will be processed." noIndex />
      <SiteLayout hideNewsletter>
        <section className="container-vh py-12">
          <h1 className="mb-8 text-3xl">Checkout</h1>
          {!hydrated ? null : !isAuth ? (
            <div className="flex flex-col items-center gap-4 border py-16 text-center">
              <p className="text-sm text-mute-text">
                Please sign in to check out — your order and address are saved to your account.
              </p>
              <div className="flex gap-2">
                <Button asChild><Link href="/login?redirect=/checkout">Sign in</Link></Button>
                <Button asChild variant="outline"><Link href="/signup">Create account</Link></Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 border py-16 text-center">
              <p className="text-sm text-mute-text">Your bag is empty — add something to check out.</p>
              <Button asChild><Link href="/new-arrivals">Shop new arrivals</Link></Button>
            </div>
          ) : (
            <CheckoutFlow />
          )}
        </section>
      </SiteLayout>
    </>
  );
}
