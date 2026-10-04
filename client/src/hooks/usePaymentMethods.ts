import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

/**
 * Which payment methods checkout may offer, as configured in the admin's
 * Settings → Payments screen.
 *
 * `razorpay` is only true when it's both switched on AND fully configured —
 * the server resolves that, so the storefront never shows an option that
 * can't actually take money.
 */
export interface PaymentMethods {
  cod: boolean;
  razorpay: boolean;
  /** Razorpay's publishable key, present only when `razorpay` is true. */
  razorpayKeyId?: string;
}

/**
 * Conservative default for when the API hasn't answered yet or is unreachable:
 * offer nothing. Guessing "COD is on" would let a shopper place an order the
 * store may have deliberately stopped accepting.
 */
const NONE: PaymentMethods = { cod: false, razorpay: false };

export function usePaymentMethods() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => apiFetch<PaymentMethods>(API_ENDPOINTS.payments.methods),
    // An admin flipping a method off should take effect quickly, and this is
    // read once per checkout.
    staleTime: 30 * 1000,
    retry: false,
  });

  return { methods: data ?? NONE, isLoading, isError };
}
