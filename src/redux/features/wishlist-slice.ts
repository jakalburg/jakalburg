import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { RootState } from "../store";

const WISHLIST_KEY = "wishlist_items";

interface WishlistState {
  ids: string[];
}

const initialState: WishlistState = {
  ids: [],
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    get_wishlist_products: (state) => {
      state.ids = getLocalStorage<string[]>(WISHLIST_KEY, []);
    },
    toggle_wishlist: (state, { payload }: PayloadAction<string>) => {
      state.ids = state.ids.includes(payload)
        ? state.ids.filter((x) => x !== payload)
        : [payload, ...state.ids];
      setLocalStorage(WISHLIST_KEY, state.ids);
    },
    reset_wishlist: (state) => {
      state.ids = [];
      setLocalStorage(WISHLIST_KEY, []);
    },
  },
});

export const { get_wishlist_products, toggle_wishlist, reset_wishlist } =
  wishlistSlice.actions;

export const selectWishlistIds = (s: RootState) => s.wishlist.ids;

export default wishlistSlice.reducer;
