// Central map of backend paths. All are relative to NEXT_PUBLIC_API_URL and
// begin with "/api/..." to match the NestJS global prefix (setGlobalPrefix('api')).
export const API_ENDPOINTS = {
  auth: {
    register: "/api/auth/register",
    verifyEmail: "/api/auth/verify-email",
    resendOtp: "/api/auth/resend-otp",
    loginPassword: "/api/auth/login-password",
    googleCallback: "/api/auth/google/callback",
    googleLink: "/api/auth/google/link",
    forgotPassword: "/api/auth/forgot-password",
    resetPassword: "/api/auth/reset-password",
    me: "/api/auth/me",
    logout: "/api/auth/logout",
    setPassword: "/api/auth/set-password",
    changePassword: "/api/auth/change-password",
    hasPassword: "/api/auth/has-password",
  },
  products: {
    list: "/api/products",
    detail: (slug: string) => `/api/products/${encodeURIComponent(slug)}`,
    related: (slug: string) => `/api/products/${encodeURIComponent(slug)}/related`,
  },
  // Editorial collections ("Shop by mood") managed from the admin. Public read;
  // the storefront filters to the enabled ones client-side.
  collections: {
    list: "/api/collections",
  },
  // The authenticated user's persistent cart — GET reads it, PUT replaces it
  // wholesale (the client mirrors its local cart up here).
  cart: {
    get: "/api/cart",
    replace: "/api/cart",
  },
  // Orders are server-authoritative: POST places one (pricing computed on the
  // server), GET /me lists the signed-in user's history, and detail reads one
  // by its order number (e.g. "JB-284917").
  orders: {
    create: "/api/orders",
    mine: "/api/orders/me",
    detail: (orderNumber: string) => `/api/orders/${encodeURIComponent(orderNumber)}`,
  },
  // Saved address history for the authenticated user — GET + full-replace PUT,
  // mirrored the same way as the cart.
  addresses: {
    get: "/api/addresses",
    replace: "/api/addresses",
  },
  // Editable homepage content managed from the admin. `hero` returns the enabled
  // hero slider's slides (empty array when none/disabled → static fallback).
  website: {
    hero: "/api/website/home-sections/hero",
  },
} as const;
