import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { RootState } from "../store";

const RECENTLY_VIEWED_KEY = "recently_viewed";
const MAX = 8;

interface RecentlyViewedState {
  ids: string[];
}

const initialState: RecentlyViewedState = {
  ids: [],
};

const recentlyViewedSlice = createSlice({
  name: "recentlyViewed",
  initialState,
  reducers: {
    get_recently_viewed: (state) => {
      state.ids = getLocalStorage<string[]>(RECENTLY_VIEWED_KEY, []);
    },
    push_recently_viewed: (state, { payload }: PayloadAction<string>) => {
      state.ids = [payload, ...state.ids.filter((x) => x !== payload)].slice(0, MAX);
      setLocalStorage(RECENTLY_VIEWED_KEY, state.ids);
    },
    reset_recently_viewed: (state) => {
      state.ids = [];
      setLocalStorage(RECENTLY_VIEWED_KEY, []);
    },
  },
});

export const { get_recently_viewed, push_recently_viewed, reset_recently_viewed } =
  recentlyViewedSlice.actions;

export const selectRecentlyViewedIds = (s: RootState) => s.recentlyViewed.ids;

export default recentlyViewedSlice.reducer;
