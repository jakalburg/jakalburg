import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./features/cart-slice";
import wishlistReducer from "./features/wishlist-slice";
import authReducer from "./features/auth-slice";
import addressesReducer from "./features/addresses-slice";
import uiReducer from "./features/ui-slice";
import recentlyViewedReducer from "./features/recently-viewed-slice";

const store = configureStore({
  reducer: {
    cart: cartReducer,
    wishlist: wishlistReducer,
    auth: authReducer,
    addresses: addressesReducer,
    ui: uiReducer,
    recentlyViewed: recentlyViewedReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
