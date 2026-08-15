import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import type { MockUser } from "@/types";
import type { RootState } from "../store";

const AUTH_KEY = "auth_user";

interface AuthState {
  user: MockUser | null;
}

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    get_auth: (state) => {
      state.user = getLocalStorage<MockUser | null>(AUTH_KEY, null);
    },
    sign_in: (state, { payload }: PayloadAction<MockUser>) => {
      state.user = payload;
      setLocalStorage(AUTH_KEY, state.user);
    },
    sign_out: (state) => {
      state.user = null;
      setLocalStorage(AUTH_KEY, null);
    },
  },
});

export const { get_auth, sign_in, sign_out } = authSlice.actions;

export const selectAuthUser = (s: RootState) => s.auth.user;

export default authSlice.reducer;
