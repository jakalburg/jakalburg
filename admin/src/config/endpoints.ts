/**
 * API Endpoints - Admin
 * Matches the structure of frontend endpoints.ts
 */

const API_ENDPOINTS = {
  // ==================== AUTHENTICATION ====================
  auth: {
    login: "/auth/login-password",
    logout: "/auth/logout",
    me: "/auth/me",
  },

  // ==================== ADMIN MANAGEMENT ====================
  admin: {
    getAll: "/admin/staff",
    create: "/admin/staff",
    update: (id: string) => `/admin/staff/${id}`,
    delete: (id: string) => `/admin/staff/${id}`,
    getById: (id: string) => `/admin/staff/${id}`, // Assuming this exists or using simple get
  },

  // ==================== DASHBOARD (real backend) ====================
  // Live aggregates for the admin home screen. Recent orders come from the
  // orders endpoints below, not from here.
  dashboard: {
    stats: "/dashboard/stats",
    sales: "/dashboard/sales", // ?period=week|month|year
  },

  // ==================== PRODUCTS ====================
  products: {
    getAll: "/products/admin/list",
    create: "/products",
    createWithMedia: "/products/create-with-media",
    getById: (id: string) => `/products/admin/${id}`,
    update: (id: string, mediaType?: string) =>
      mediaType ? `/products/${id}/media` : `/products/${id}`,
    updateStatus: (id: string) => `/products/${id}/status`,
    bulkStatus: "/products/bulk-status",
    delete: (id: string) => `/products/${id}`,
    getRelated: (id: string) => `/products/related/${id}`,
    search: "/products/admin/search",
    // Distinct category slugs actually in use. The product form's combobox no
    // longer reads this — it uses categories.picker, which also includes
    // managed categories that have no products yet.
    categories: "/products/meta/categories",
    uploadMedia: (id: string) => `/products/${id}/media`,
    deleteMedia: (id: string, mediaId: string) =>
      `/products/${id}/media/${mediaId}`,
  },

  // ==================== UPLOADS (real backend → Cloudinary) ====================
  uploads: {
    images: "/uploads/images", // POST multipart, field "images", up to 10 files
    deleteImage: "/uploads/image", // DELETE ?url=<cloudinary url>
  },

  // ==================== FABRICS (real backend) ====================
  fabrics: {
    getAll: "/fabrics",
    create: "/fabrics",
    update: (id: string) => `/fabrics/${id}`,
    delete: (id: string) => `/fabrics/${id}`,
  },

  // ==================== CATEGORIES ====================
  // Product categories — REAL backend. `adminList` includes inactive rows and
  // product counts and seeds from the catalogue on first read; `picker` is the
  // merged slug list the product form's category combobox offers.
  categories: {
    adminList: "/categories/admin/list",
    picker: "/categories/picker",
    create: "/categories",
    byId: (id: string) => `/categories/${id}`,
    update: (id: string) => `/categories/${id}`,
    delete: (id: string) => `/categories/${id}`,
    seed: "/categories/seed",
  },

  // ==================== COUPONS (real backend) ====================
  coupons: {
    getAll: "/coupons",
    create: "/coupons",
    getById: (id: string) => `/coupons/${id}`,
    usage: (id: string) => `/coupons/${id}/usage`,
    update: (id: string) => `/coupons/${id}`,
    delete: (id: string) => `/coupons/${id}`,
    validate: "/coupons/validate",
  },

  // ==================== COLLECTIONS ====================
  collections: {
    all: "/collections",
    create: "/collections",
    byId: (id: string) => `/collections/${id}`,
    update: (id: string) => `/collections/${id}`,
    delete: (id: string) => `/collections/${id}`,
  },

  // ==================== REVIEWS ====================
  // Real backend (NestJS ReviewsController). The `/admin` segment is what
  // separates these moderation routes from the customer-facing ones on the
  // storefront — all three are @AdminOnly.
  reviews: {
    all: "/reviews/admin/all",
    create: "/reviews/admin",
    bulkCreate: "/reviews/admin/bulk",
    setDisplay: "/reviews/admin/display",
    updateStatus: (id: string) => `/reviews/admin/${id}`,
    delete: (id: string) => `/reviews/admin/${id}`,
  },

  // ==================== MEDIA ====================
  media: {
    uploadImage: "/media/image",
  },

  // ==================== NOTIFICATIONS ====================
  // The admin header bell + Settings → Notifications — REAL backend, admin-only.
  // `settings` takes no user id: the preferences are a store-wide singleton,
  // not per-account (see the Notification Prisma model for why).
  notifications: {
    all: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
    settings: "/settings/notifications",
  },

  // ==================== PAYMENTS ====================
  // Payment configuration — REAL backend. `methods` is the public read the
  // storefront uses; `settings` is admin-only and never returns the Razorpay
  // key secret (only an `isRazorpaySecretSet` flag).
  payments: {
    methods: "/payments/methods",
    settings: "/payments/settings",
  },

  // ==================== SETTINGS ====================
  // Global store identity (brand marks, name, contact details, socials, SEO) —
  // REAL backend. `get` is public (the storefront reads it too); `update` is
  // admin-only. The rest are kaybykhushie leftovers with no backend here.
  settings: {
    get: "/settings",
    update: "/settings",
    notifications: "/settings/notifications",
    // Email / SMTP — REAL backend, admin-only (it holds a credential, so
    // unlike the public store settings it is never exposed to the storefront).
    // The stored password is never returned; reads carry isSmtpConfigured.
    email: {
      get: "/settings/email",
      update: "/settings/email",
      verify: "/settings/email/verify",
    },
    // Media storage (Cloudinary / Cloudflare R2) + the Redis cache — REAL
    // backend, admin-only, same reason: three credentials live here. None is
    // ever returned; reads carry isCloudinaryConfigured / isR2Configured /
    // isRedisConfigured. `update` writes BOTH the storage and the Redis
    // fields — they share one settings row.
    storage: {
      get: "/settings/storage",
      update: "/settings/storage",
      verify: "/settings/storage/verify",
      usage: "/settings/storage/usage",
    },
    // Maintenance mode — REAL backend, admin-only. These routes stay reachable
    // while maintenance is ON (MaintenanceGuard lets every @AdminOnly route
    // through), which is what makes it possible to switch back off.
    maintenance: {
      get: "/settings/maintenance",
      update: "/settings/maintenance",
      previewToken: "/settings/maintenance/preview-token",
      revokeToken: "/settings/maintenance/preview-token/revoke",
    },
    // Operational cache routes. Each one spends Upstash commands against a
    // 10,000/day free-tier budget, so these are fetched on demand — never on
    // an interval.
    redis: {
      stats: "/settings/redis/stats",
      keys: "/settings/redis/keys",
      verify: "/settings/redis/verify",
      flush: "/settings/redis/flush",
    },
  },

  // ==================== PAGES ====================
  // Storefront static pages (Shipping, Returns, Privacy, Terms, FAQ) — REAL
  // backend. `getAll` is the admin list (includes inactive drafts); the bare
  // "/pages" and "/pages/slug/:slug" reads are public and used by the client.
  pages: {
    getAll: "/pages/all",
    create: "/pages",
    getById: (id: string) => `/pages/${id}`,
    getBySlug: (slug: string) => `/pages/slug/${slug}`,
    update: (id: string) => `/pages/${id}`,
    delete: (id: string) => `/pages/${id}`,
    seed: "/pages/seed",
  },

  // ==================== WEBSITE (HOME SETTINGS) ====================
  website: {
    homeSections: {
      all: "/website/home-sections/all",
      update: (id: string) => `/website/home-sections/${id}`,
      seed: "/website/home-sections/seed",
    },
    // About page singleton — GET public, PATCH admin-only.
    about: "/website/about",
    // Contact page singleton — GET public, PATCH admin-only.
    contact: "/website/contact",
  },

  // ==================== CONTACT INBOX (real backend) ====================
  // Storefront contact-form + newsletter submissions. `getAll` filters by type
  // ("contact_us" | "newsletter"); status flip + delete are admin-only.
  contact: {
    getAll: "/contact",
    updateStatus: (id: string) => `/contact/${id}/status`,
    delete: (id: string) => `/contact/${id}`,
  },
};

export default API_ENDPOINTS;
