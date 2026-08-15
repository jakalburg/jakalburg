import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { MockOrder } from "@/types";
import { seedOrders } from "@/data/mockOrders";
import type { RootState } from "../store";

const ORDERS_KEY = "orders";

interface OrdersState {
  orders: MockOrder[];
  seeded: boolean;
}

const initialState: OrdersState = {
  orders: [],
  seeded: false,
};

const persist = (state: OrdersState) =>
  setLocalStorage(ORDERS_KEY, { orders: state.orders, seeded: state.seeded });

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    get_orders: (state) => {
      const persisted = getLocalStorage<OrdersState>(ORDERS_KEY, initialState);
      state.orders = persisted.orders;
      state.seeded = persisted.seeded;
    },
    ensure_seed: (state) => {
      if (state.seeded) return;
      state.orders = [...seedOrders, ...state.orders];
      state.seeded = true;
      persist(state);
    },
    add_order: (state, { payload }: PayloadAction<MockOrder>) => {
      state.orders = [payload, ...state.orders];
      persist(state);
    },
  },
});

export const { get_orders, ensure_seed, add_order } = ordersSlice.actions;

export const selectOrders = (s: RootState) => s.orders.orders;
export const selectOrderById = (id: string) => (s: RootState) =>
  s.orders.orders.find((o) => o.id === id);

export default ordersSlice.reducer;
