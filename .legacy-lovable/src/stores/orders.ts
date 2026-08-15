import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MockOrder } from "@/types";
import { seedOrders } from "@/data/mockOrders";

interface OrderState {
  orders: MockOrder[];
  seeded: boolean;
  ensureSeed: () => void;
  addOrder: (order: MockOrder) => void;
  getOrder: (id: string) => MockOrder | undefined;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      seeded: false,
      ensureSeed: () => {
        if (get().seeded) return;
        set({ orders: [...seedOrders, ...get().orders], seeded: true });
      },
      addOrder: (order) => set({ orders: [order, ...get().orders] }),
      getOrder: (id) => get().orders.find((o) => o.id === id),
    }),
    {
      name: "vh-orders",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage),
      ),
      skipHydration: true,
      partialize: (s) => ({ orders: s.orders, seeded: s.seeded }),
    },
  ),
);
