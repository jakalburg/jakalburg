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
    // Paginated: accepts page/limit plus gender, category, collection, isNew,
    // onSale, essential, size, color, ids, search and sort.
    list: "/api/products",
    // Distinct sizes/colours across everything matching the same filters —
    // the listing pages' filter chips, which a single page can't supply.
    facets: "/api/products/meta/facets",
    detail: (slug: string) => `/api/products/${encodeURIComponent(slug)}`,
    related: (slug: string) => `/api/products/${encodeURIComponent(slug)}/related`,
  },
  // Editorial collections ("Shop by mood") managed from the admin. Public read;
  // the storefront filters to the enabled ones client-side.
  collections: {
    list: "/api/collections",
  },
  // Discount coupons. `validate` prices a code against the cart subtotal at
  // checkout (server-authoritative — the client only ever sends the code).
  coupons: {
    validate: "/api/coupons/validate",
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
  // Product reviews. `forProduct` is public and returns APPROVED reviews only
  // (plus the star summary); everything else is scoped to the signed-in user,
  // who may only review a product from an order of theirs that was delivered.
  // New reviews start `pending` and surface on the storefront once an admin
  // approves them in the dashboard.
  reviews: {
    forProduct: (slug: string) => `/api/reviews/product/${encodeURIComponent(slug)}`,
    mine: "/api/reviews/me",
    create: "/api/reviews",
    update: (id: string) => `/api/reviews/${encodeURIComponent(id)}`,
    delete: (id: string) => `/api/reviews/${encodeURIComponent(id)}`,
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
    // Public Contact page content (details + copy), edited in the admin.
    contact: "/api/website/contact",
  },
  // Storefront contact form + newsletter signup. Public POST; both feed the
  // admin Contact inbox (discriminated by `type`: "contact_us" | "newsletter").
  contact: {
    submit: "/api/contact",
  },
} as const;
