import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { CartItem } from "@/types";
import type { RootState } from "../store";

const CART_KEY = "cart_products";

export const itemKey = (i: Pick<CartItem, "productId" | "size" | "color">) =>
  `${i.productId}::${i.size}::${i.color}`;

interface CartState {
  items: CartItem[];
}

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    get_cart_products: (state) => {
      state.items = getLocalStorage<CartItem[]>(CART_KEY, []);
    },
    add_cart_product: (state, { payload }: PayloadAction<CartItem>) => {
      const key = itemKey(payload);
      const existing = state.items.find((i) => itemKey(i) === key);
      if (existing) {
        existing.quantity += payload.quantity;
      } else {
        state.items.push(payload);
      }
      setLocalStorage(CART_KEY, state.items);
    },
    update_cart_quantity: (
      state,
      { payload }: PayloadAction<{ key: string; qty: number }>,
    ) => {
      state.items = state.items
        .map((i) =>
          itemKey(i) === payload.key ? { ...i, quantity: Math.max(1, payload.qty) } : i,
        )
        .filter((i) => i.quantity > 0);
      setLocalStorage(CART_KEY, state.items);
    },
    remove_cart_product: (state, { payload }: PayloadAction<string>) => {
      state.items = state.items.filter((i) => itemKey(i) !== payload);
      setLocalStorage(CART_KEY, state.items);
    },
    clear_cart: (state) => {
      state.items = [];
      setLocalStorage(CART_KEY, []);
    },
    // Replace the whole cart with a server-provided list (adopt-on-login and
    // post-reconcile sync). Persists so a refresh keeps the synced copy.
    set_cart: (state, { payload }: PayloadAction<CartItem[]>) => {
      state.items = payload;
      setLocalStorage(CART_KEY, payload);
    },
  },
});

export const {
  get_cart_products,
  add_cart_product,
  update_cart_quantity,
  remove_cart_product,
  clear_cart,
  set_cart,
} = cartSlice.actions;

export const selectCartItems = (s: RootState) => s.cart.items;
export const selectCartCount = (s: RootState) =>
  s.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartSubtotal = (s: RootState) =>
  s.cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

export default cartSlice.reducer;
