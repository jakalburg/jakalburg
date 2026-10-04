import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  ORDER_PAGE_SIZE,
  toPaginated,
  toQueryString,
  type Paginated,
} from "@/lib/pagination";
import { useAppSelector } from "@/redux/hooks";
import { selectIsAuthenticated } from "@/redux/features/auth-slice";
import type { Address, MockOrder } from "@/types";

const E = API_ENDPOINTS.orders;

// Query keys. Orders are keyed by the server order number (MockOrder.id).
export const ordersKey = ["orders"] as const;
export const orderKey = (orderNumber: string) => ["order", orderNumber] as const;

// The line items the server needs to place an order — everything else (price,
// title, image, slug) is resolved server-side from the live product.
export interface CreateOrderInput {
  items: { productId: string; size: string; color: string; quantity: number }[];
  shipping: number;
  discount?: number;
  /** Coupon code to apply. The server validates it and recomputes the discount. */
  couponCode?: string;
  address: Address;
  email: string;
  paymentLabel: string;
}

// One page of the signed-in user's order history (most recent first). Only
// runs when authenticated — orders are always account-scoped.
export function useOrders({
  page = 1,
  limit = ORDER_PAGE_SIZE,
}: { page?: number; limit?: number } = {}) {
  const isAuth = useAppSelector(selectIsAuthenticated);
  return useQuery({
    queryKey: [...ordersKey, page, limit],
    queryFn: () =>
      apiFetch<Paginated<MockOrder> | MockOrder[]>(
        `${E.mine}${toQueryString({ page, limit })}`,
        { auth: true },
      ).then((raw) => toPaginated<MockOrder>(raw, limit)),
    enabled: isAuth,
    // Orders change out-of-band (a checkout in another view places one), and the
    // global default is refetchOnMount:false with a long staleTime — meant for
    // the catalogue, not this list. Always refetch on mount so a just-placed
    // order shows the moment you open "My orders".
    refetchOnMount: "always",
    // Keep the current page visible while the next one loads.
    placeholderData: (previous) => previous,
  });
}

// A single order by its order number. Guarded on both auth and a non-empty id
// so it doesn't fire before the router hydrates the [id] param.
export function useOrder(orderNumber: string) {
  const isAuth = useAppSelector(selectIsAuthenticated);
  return useQuery({
    queryKey: orderKey(orderNumber),
    queryFn: () => apiFetch<MockOrder>(E.detail(orderNumber), { auth: true }),
    enabled: isAuth && Boolean(orderNumber),
  });
}

// Place an order. On success the returned order is written straight into the
// cache so the confirmation page renders instantly, and the list is refreshed.
export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderInput) =>
      apiFetch<MockOrder>(E.create, { method: "POST", body, auth: true }),
    onSuccess: (order) => {
      qc.setQueryData(orderKey(order.id), order);
      // refetchType:"all" so the (currently unmounted) orders list is refreshed
      // now, not just marked stale — otherwise a cached empty list would linger.
      void qc.invalidateQueries({ queryKey: ordersKey, refetchType: "all" });
    },
  });
}

/** What the server needs to open a Razorpay payment window. */
export interface RazorpayOrder {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

/**
 * Pay online, then place the order.
 *
 * Three server round-trips, in this order:
 *   1. `razorpay-order` — the server prices the cart and opens a payable
 *      order. Nothing is stored yet, so abandoning here costs nothing.
 *   2. Razorpay's window collects the money (handled by the caller).
 *   3. `verify-razorpay` — the server checks the signature with Razorpay and
 *      only then writes the order.
 *
 * The order never exists until the money is verified, so there is no window in
 * which an unpaid order can be mistaken for a real one.
 */
export function useRazorpayCheckout() {
  const qc = useQueryClient();

  return {
    /** Step 1 — ask the server what to charge and get a payable order. */
    createRazorpayOrder: (body: CreateOrderInput) =>
      apiFetch<RazorpayOrder>(API_ENDPOINTS.payments.razorpayOrder, {
        method: "POST",
        body,
        auth: true,
      }),

    /** Step 3 — prove the payment and receive the placed order. */
    verifyAndPlace: async (payload: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
      order: CreateOrderInput;
    }) => {
      const order = await apiFetch<MockOrder>(API_ENDPOINTS.payments.verifyRazorpay, {
        method: "POST",
        body: payload,
        auth: true,
      });
      qc.setQueryData(orderKey(order.id), order);
      void qc.invalidateQueries({ queryKey: ordersKey, refetchType: "all" });
      return order;
    },
  };
}
