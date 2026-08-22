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
    categories: "/products/meta/categories", // distinct category slugs
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
  categories: {
    getAll: "/category/show",
    create: "/category/add",
    update: (id: string) => `/category/${id}`, // Assuming update endpoint exists
    delete: (id: string) => `/category/${id}`, // Assuming delete endpoint exists
  },

  // ==================== BRANDS ====================
  brands: {
    all: "/brands",
    create: "/brands",
    byId: (id: string) => `/brands/${id}`,
    update: (id: string) => `/brands/${id}`,
    delete: (id: string) => `/brands/${id}`,
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
  reviews: {
    all: "/review",
    update: (id: string) => `/review/${id}`,
    delete: (id: string) => `/review/${id}`,
  },

  // ==================== MEDIA ====================
  media: {
    uploadImage: "/media/image",
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    all: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
    settings: (userId: string) => `/settings/notifications/${userId}`, // Base URL is settings, but we can organize it here or under settings
  },

  // ==================== SETTINGS ====================
  settings: {
    notifications: (userId: string) => `/settings/notifications/${userId}`,
    clearCache: "/settings/clear-cache",
    verifyStorage: "/settings/storage/verify",
    verifyRedis: "/settings/redis/verify",
  },

  // ==================== PAGES ====================
  pages: {
    getAll: "/pages",
    create: "/pages",
    getById: (id: string) => `/pages/${id}`, // Admin uses ID
    getBySlug: (slug: string) => `/pages/${slug}`, // Public uses slug (if needed in admin)
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
  },

  // ==================== SYSTEM LOGS ====================
  logs: {
    getAll: "/logs",
    getById: (id: string) => `/logs/${id}`,
    updateStatus: (id: string) => `/logs/${id}/status`,
    delete: (id: string) => `/logs/${id}`,
    clear: "/logs/clear",
    export: "/logs/export",
  },
};

export default API_ENDPOINTS;
