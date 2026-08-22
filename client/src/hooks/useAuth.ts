import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { normalizeUser } from "@/lib/auth-normalize";
import { useAppDispatch } from "@/redux/hooks";
import { set_credentials, sign_in, sign_out } from "@/redux/features/auth-slice";
import { set_cart } from "@/redux/features/cart-slice";
import { set_addresses, update_profile } from "@/redux/features/addresses-slice";
import { ACCOUNT_SYNC_KEY } from "@/components/common/account-sync";
import type { AuthResponse, BackendUser } from "@/types";

const E = API_ENDPOINTS.auth;

export type OtpPurpose = "SIGNUP_VERIFICATION" | "PASSWORD_RESET";

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
export interface VerifyEmailPayload {
  email: string;
  otp: string;
}
export interface LoginPayload {
  email: string;
  password: string;
}
export interface ResetPayload {
  email: string;
  token: string;
  newPassword: string;
}

// Persists a returned { user, accessToken } into redux and mirrors the display
// name/email onto the profile slice so account/checkout prefill keeps working.
function useStoreSession() {
  const dispatch = useAppDispatch();
  return (res: AuthResponse) => {
    const user = normalizeUser(res.user);
    dispatch(set_credentials({ user, token: res.accessToken }));
    dispatch(update_profile({ email: user.email, fullName: user.name }));
    return user;
  };
}

// POST /register → { message }. The signup OTP is emailed by the backend.
export function useRegister() {
  return useMutation({
    mutationFn: (p: RegisterPayload) =>
      apiFetch<{ message: string }>(E.register, { method: "POST", body: p }),
  });
}

export function useVerifyEmail() {
  const store = useStoreSession();
  return useMutation({
    mutationFn: (p: VerifyEmailPayload) =>
      apiFetch<AuthResponse>(E.verifyEmail, { method: "POST", body: p }),
    onSuccess: (res) => store(res),
  });
}

export function useLoginPassword() {
  const store = useStoreSession();
  return useMutation({
    mutationFn: (p: LoginPayload) =>
      apiFetch<AuthResponse>(E.loginPassword, { method: "POST", body: p }),
    onSuccess: (res) => store(res),
  });
}

export function useGoogleLogin() {
  const store = useStoreSession();
  return useMutation({
    mutationFn: (credential: string) =>
      apiFetch<AuthResponse>(E.googleCallback, {
        method: "POST",
        body: { credential },
      }),
    onSuccess: (res) => store(res),
  });
}

// POST /auth/google/link → { user }. Connects the presented Google identity to
// the signed-in user (server verifies the ID token, enforces email match, and
// refuses a Google account already linked elsewhere) and refreshes the stored
// user so the "Connected Accounts" UI flips to connected. Token is unchanged.
export function useLinkGoogle() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (credential: string) =>
      apiFetch<{ user: BackendUser }>(E.googleLink, {
        method: "POST",
        body: { credential },
        auth: true,
      }),
    onSuccess: (res) => {
      dispatch(sign_in(normalizeUser(res.user)));
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (p: { email: string; purpose: OtpPurpose }) =>
      apiFetch<{ message: string }>(E.resendOtp, { method: "POST", body: p }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<{ message: string }>(E.forgotPassword, {
        method: "POST",
        body: { email },
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (p: ResetPayload) =>
      apiFetch<{ message: string }>(E.resetPassword, {
        method: "POST",
        body: p,
      }),
  });
}

export function useLogout() {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string; success: boolean }>(E.logout, {
        method: "POST",
        auth: true,
      }),
    // Clear the local session regardless of the server response. Dropping the
    // token first (sign_out) means the subsequent cart/address resets won't be
    // mirrored back up — they just clear this browser's copy of the previous
    // user's data. Orders live only in the query cache, so drop them too.
    onSettled: () => {
      dispatch(sign_out());
      dispatch(set_cart([]));
      dispatch(set_addresses([]));
      try {
        window.localStorage.removeItem(ACCOUNT_SYNC_KEY);
      } catch {
        /* ignore */
      }
      qc.removeQueries({ queryKey: ["orders"] });
      qc.removeQueries({ queryKey: ["order"] });
    },
  });
}
