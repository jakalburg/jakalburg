import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectCartItems, set_cart } from "@/redux/features/cart-slice";
import { selectAddresses, set_addresses } from "@/redux/features/addresses-slice";
import { selectAuthUser, selectIsAuthenticated } from "@/redux/features/auth-slice";
import type { Address, CartItem } from "@/types";

// Marks which user this browser has already reconciled with the server. Its
// presence distinguishes a *fresh login* (merge the guest cart/addresses up)
// from a *page refresh* (adopt the server copy only). Cleared on logout.
export const ACCOUNT_SYNC_KEY = "account_synced_uid";

const E = API_ENDPOINTS;

type CartResponse = { items: CartItem[] };
type CartLineInput = { productId: string; size: string; color: string; quantity: number };

const toInput = (items: CartItem[]): CartLineInput[] =>
  items.map((i) => ({ productId: i.productId, size: i.size, color: i.color, quantity: i.quantity }));

const lineKey = (i: CartLineInput) => `${i.productId}::${i.size}::${i.color}`;

// An order-independent signature of a cart, used to suppress echo PUTs when the
// only change is a server-driven adopt.
const cartSig = (items: CartItem[]) =>
  toInput(items)
    .map((i) => `${lineKey(i)}=${i.quantity}`)
    .sort()
    .join("|");

// Union the guest (local) cart into the server cart, summing quantities on
// matching product/size/color lines.
const mergeCart = (server: CartItem[], local: CartItem[]): CartLineInput[] => {
  const map = new Map<string, CartLineInput>();
  for (const line of [...toInput(server), ...toInput(local)]) {
    const existing = map.get(lineKey(line));
    if (existing) existing.quantity += line.quantity;
    else map.set(lineKey(line), { ...line });
  }
  return [...map.values()];
};

// Append guest addresses the server doesn't already have (matched by id).
const mergeAddresses = (server: Address[], local: Address[]): Address[] => {
  const ids = new Set(server.map((a) => a.id));
  return [...server, ...local.filter((a) => !ids.has(a.id))];
};

// Client-only. Keeps the cart and address book in sync with the account:
//  - on login/refresh it reconciles local ↔ server (merge on first login,
//    adopt on refresh),
//  - afterwards it mirrors any local change back up to the server (debounced).
// Rendered once from _app, inside both the redux and query providers.
export default function AccountSync() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const isAuth = useAppSelector(selectIsAuthenticated);
  const userId = useAppSelector(selectAuthUser)?.id ?? null;
  const cartItems = useAppSelector(selectCartItems);
  const addresses = useAppSelector(selectAddresses);

  // `synced` gates the mirror effects so they never fire mid-reconcile.
  const [synced, setSynced] = useState(false);
  const reconciledFor = useRef<string | null>(null);
  const cartSigRef = useRef<string>("");
  const addrSigRef = useRef<string>("");

  // Latest local values, readable inside the async reconcile without making it
  // a dependency (which would restart it on every keystroke).
  const cartRef = useRef(cartItems);
  const addrRef = useRef(addresses);
  cartRef.current = cartItems;
  addrRef.current = addresses;

  // --- Reconcile once per authenticated user (login or refresh) ---
  useEffect(() => {
    if (!isAuth || !userId) {
      reconciledFor.current = null;
      setSynced(false);
      // A signed-out browser must not be able to read a prior user's orders.
      qc.removeQueries({ queryKey: ["orders"] });
      qc.removeQueries({ queryKey: ["order"] });
      return;
    }
    if (reconciledFor.current === userId) return;
    reconciledFor.current = userId;
    setSynced(false);

    const firstLogin = getLocalStorage<string | null>(ACCOUNT_SYNC_KEY, null) !== userId;
    let cancelled = false;

    void (async () => {
      // Cart: merge the guest cart up on first login, otherwise adopt the server's.
      let cart: CartResponse;
      if (firstLogin && cartRef.current.length > 0) {
        const current = await apiFetch<CartResponse>(E.cart.get, { auth: true });
        cart = await apiFetch<CartResponse>(E.cart.replace, {
          method: "PUT",
          body: { items: mergeCart(current.items, cartRef.current) },
          auth: true,
        });
      } else {
        cart = await apiFetch<CartResponse>(E.cart.get, { auth: true });
      }
      if (cancelled) return;
      cartSigRef.current = cartSig(cart.items);
      dispatch(set_cart(cart.items));

      // Addresses: same merge-then-adopt shape.
      let addrs = await apiFetch<Address[]>(E.addresses.get, { auth: true });
      if (firstLogin && addrRef.current.length > 0) {
        addrs = await apiFetch<Address[]>(E.addresses.replace, {
          method: "PUT",
          body: { addresses: mergeAddresses(addrs, addrRef.current) },
          auth: true,
        });
      }
      if (cancelled) return;
      addrSigRef.current = JSON.stringify(addrs);
      dispatch(set_addresses(addrs));

      setLocalStorage(ACCOUNT_SYNC_KEY, userId);
      setSynced(true);
    })().catch(() => {
      // Network/auth failure — leave local state and allow a retry on the next
      // auth change rather than clobbering the user's data.
      reconciledFor.current = null;
    });

    return () => {
      cancelled = true;
    };
  }, [isAuth, userId, dispatch, qc]);

  // --- Mirror the cart up to the server (debounced) after reconcile ---
  useEffect(() => {
    if (!synced || !isAuth || !userId) return;
    const sig = cartSig(cartItems);
    if (sig === cartSigRef.current) return;
    cartSigRef.current = sig;
    const t = setTimeout(() => {
      void apiFetch<CartResponse>(E.cart.replace, {
        method: "PUT",
        body: { items: toInput(cartItems) },
        auth: true,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [cartItems, synced, isAuth, userId]);

  // --- Mirror the address book up to the server (debounced) after reconcile ---
  useEffect(() => {
    if (!synced || !isAuth || !userId) return;
    const sig = JSON.stringify(addresses);
    if (sig === addrSigRef.current) return;
    addrSigRef.current = sig;
    const t = setTimeout(() => {
      void apiFetch<Address[]>(E.addresses.replace, {
        method: "PUT",
        body: { addresses },
        auth: true,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [addresses, synced, isAuth, userId]);

  return null;
}
