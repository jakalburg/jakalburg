import { useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { get_cart_products } from "@/redux/features/cart-slice";
import { get_wishlist_products } from "@/redux/features/wishlist-slice";
import { get_auth } from "@/redux/features/auth-slice";
import { get_addresses } from "@/redux/features/addresses-slice";
import { get_recently_viewed } from "@/redux/features/recently-viewed-slice";

// Client-only. Rehydrates every persisted slice from localStorage on mount so
// SSR HTML matches the empty initial state, then fills in after hydration.
// (Orders are no longer client state — they live on the server and are read via
// React Query; see hooks/useOrders. Cart/address reconciliation with the
// account is handled by AccountSync.)
export default function StoreDataSync() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(get_cart_products());
    dispatch(get_wishlist_products());
    dispatch(get_auth());
    dispatch(get_addresses());
    dispatch(get_recently_viewed());
  }, [dispatch]);

  return null;
}
