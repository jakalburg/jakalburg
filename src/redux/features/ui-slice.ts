import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";

// UI slice is intentionally NOT persisted. Drawer, menu, modal, search and
// filter open state must reset after refresh.
interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  mobileNavOpen: boolean;
  filtersOpen: boolean;
}

const initialState: UIState = {
  cartOpen: false,
  searchOpen: false,
  mobileNavOpen: false,
  filtersOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setCartOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.cartOpen = payload;
    },
    setSearchOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.searchOpen = payload;
    },
    setMobileNavOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.mobileNavOpen = payload;
    },
    setFiltersOpen: (state, { payload }: PayloadAction<boolean>) => {
      state.filtersOpen = payload;
    },
  },
});

export const { setCartOpen, setSearchOpen, setMobileNavOpen, setFiltersOpen } =
  uiSlice.actions;

export const selectUI = (s: RootState) => s.ui;

export default uiSlice.reducer;
