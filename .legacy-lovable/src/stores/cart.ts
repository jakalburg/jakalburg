import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  updateQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  itemCount: () => number;
  subtotal: () => number;
}

export const itemKey = (i: Pick<CartItem, "productId" | "size" | "color">) =>
  `${i.productId}::${i.size}::${i.color}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const key = itemKey(item);
        const existing = get().items.find((i) => itemKey(i) === key);
        set({
          items: existing
            ? get().items.map((i) =>
                itemKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i,
              )
            : [...get().items, item],
        });
      },
      updateQuantity: (key, qty) =>
        set({
          items: get()
            .items.map((i) => (itemKey(i) === key ? { ...i, quantity: Math.max(1, qty) } : i))
            .filter((i) => i.quantity > 0),
        }),
      remove: (key) => set({ items: get().items.filter((i) => itemKey(i) !== key) }),
      clear: () => set({ items: [] }),
      itemCount: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    {
      name: "vh-cart",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
