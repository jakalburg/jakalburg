import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getLocalStorage, setLocalStorage } from "@/utils/localstorage";
import { getToken, setToken, clearToken } from "@/lib/api-client";
import type { AuthUser } from "@/types";
import type { RootState } from "../store";

// The user object is persisted as JSON under "auth_user"; the JWT is owned by
// api-client (raw string under "auth_token") and reached via the token helpers.
const AUTH_KEY = "auth_user";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    get_auth: (state) => {
      state.user = getLocalStorage<AuthUser | null>(AUTH_KEY, null);
      state.token = getToken();
    },
    // Store a full session (user + JWT) after login / verify / google sign-in.
    set_credentials: (
      state,
      { payload }: PayloadAction<{ user: AuthUser; token: string }>,
    ) => {
      state.user = payload.user;
      state.token = payload.token;
      setLocalStorage(AUTH_KEY, payload.user);
      setToken(payload.token);
    },
    // Update just the stored user (e.g. a profile edit) without touching the token.
    sign_in: (state, { payload }: PayloadAction<AuthUser>) => {
      state.user = payload;
      setLocalStorage(AUTH_KEY, payload);
    },
    sign_out: (state) => {
      state.user = null;
      state.token = null;
      setLocalStorage(AUTH_KEY, null);
      clearToken();
    },
  },
});

export const { get_auth, set_credentials, sign_in, sign_out } =
  authSlice.actions;

export const selectAuthUser = (s: RootState) => s.auth.user;
export const selectAuthToken = (s: RootState) => s.auth.token;
export const selectIsAuthenticated = (s: RootState) =>
  !!s.auth.token && !!s.auth.user;

export default authSlice.reducer;
