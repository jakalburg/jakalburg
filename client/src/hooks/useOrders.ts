import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
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
  address: Address;
  email: string;
  paymentLabel: string;
}

// The signed-in user's full order history (most recent first). Only runs when
// authenticated — orders are always account-scoped.
export function useOrders() {
  const isAuth = useAppSelector(selectIsAuthenticated);
  return useQuery({
    queryKey: ordersKey,
    queryFn: () => apiFetch<MockOrder[]>(E.mine, { auth: true }),
    enabled: isAuth,
    // Orders change out-of-band (a checkout in another view places one), and the
    // global default is refetchOnMount:false with a long staleTime — meant for
    // the catalogue, not this list. Always refetch on mount so a just-placed
    // order shows the moment you open "My orders".
    refetchOnMount: "always",
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
