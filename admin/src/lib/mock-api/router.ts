// ---------------------------------------------------------------------------
// Mock request router for the UI-only admin build.
//
// `resolveMock(method, url, ctx)` maps an HTTP method + endpoint path to the
// exact payload shape the corresponding service/hook expects (bare arrays,
// `{ data, total, skip, take, hasMore }` envelopes for products/logs, and
// `{ items, ... }` for orders). Writes echo a plausible result so mutations,
// optimistic updates and toasts behave like the real API.
// ---------------------------------------------------------------------------

import * as db from "./data";

export interface MockContext {
  params?: Record<string, any>;
  data?: any;
  responseType?: string;
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

let idCounter = 1;
const genId = (prefix = "mock") => `${prefix}-${Date.now().toString(36)}-${idCounter++}`;
const nowISO = () => new Date().toISOString();

/** Split a possibly-query-bearing URL into a clean path + parsed query object. */
function parseUrl(rawUrl: string): { path: string; query: Record<string, string> } {
  let url = rawUrl || "/";
  // Strip any absolute origin/baseURL — services use relative paths, but be safe.
  url = url.replace(/^https?:\/\/[^/]+/i, "");
  url = url.replace(/^\/api(?=\/)/, ""); // config baseURL may include /api
  const [path, queryString] = url.split("?");
  const query: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  return { path: path.replace(/\/+$/, "") || "/", query };
}

const paginate = (all: any[], skip = 0, take = 10) => ({
  data: all.slice(skip, skip + take),
  total: all.length,
  skip,
  take,
  hasMore: skip + take < all.length,
});

function csvBlob(rows: any[]): any {
  const headers = ["id", "message", "errorType", "severity", "status", "createdAt"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => JSON.stringify(r[h] ?? "")).join(","));
  }
  const csv = lines.join("\n");
  try {
    return new Blob([csv], { type: "text/csv" });
  } catch {
    return csv;
  }
}

export function resolveMock(method: Method, rawUrl: string, ctx: MockContext = {}): any {
  const { path, query } = parseUrl(rawUrl);
  const params = { ...query, ...(ctx.params || {}) };
  const body = ctx.data ?? {};
  const seg = path.split("/").filter(Boolean); // e.g. ["products","admin","list"]

  // ------------------------------- GET -------------------------------------
  if (method === "GET") {
    // Dashboard
    if (path === "/dashboard/stats") return db.mockDashboardStats;
    if (path === "/dashboard/sales") return db.mockSalesData;

    // Products
    if (path === "/products/admin/list") {
      const skip = Number(params.skip ?? 0);
      const take = Number(params.take ?? 10);
      let list = [...db.mockProducts];
      if (params.status === "active") list = list.filter((p) => p.isActive);
      else if (params.status === "disabled") list = list.filter((p) => !p.isActive);
      if (params.isStealDeal === "true") list = list.filter((p) => p.isStealDeal);
      else list = list.filter((p) => !p.isStealDeal);
      if (params.category) list = list.filter((p) => p.category === params.category);
      return paginate(list, skip, take);
    }
    if (path === "/products/admin/search") {
      const q = String(params.query || "").toLowerCase();
      let list = db.mockProducts.filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.tags || []).some((t: string) => t.toLowerCase().includes(q)),
      );
      if (params.isStealDeal === "true") list = list.filter((p) => p.isStealDeal);
      return { data: list };
    }
    if (seg[0] === "products" && seg[1] === "related") {
      return { data: db.mockProducts.slice(0, 4) };
    }
    if (seg[0] === "products" && seg[1] === "admin" && seg[2]) {
      return db.mockProducts.find((p) => p.id === seg[2]) || db.mockProducts[0];
    }

    // Orders (must precede generic matches)
    if (path === "/orders") {
      let items = [...db.mockOrdersRaw];
      if (params.status) items = items.filter((o) => o.status === params.status);
      if (params.deliveryStatus) items = items.filter((o) => o.deliveryStatus === params.deliveryStatus);
      if (params.sort === "createdAt:desc") {
        items = items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      }
      const limit = params.limit ? Number(params.limit) : items.length;
      const sliced = items.slice(0, limit);
      return { items: sliced, total: db.mockOrdersRaw.length, skip: 0, take: limit, hasMore: false };
    }
    if (seg[0] === "orders" && seg[2] === "details") return db.mockOrderDetails(seg[1]);
    if (seg[0] === "orders" && seg[1]) return db.mockOrdersRaw.find((o) => o.id === seg[1]) || db.mockOrdersRaw[0];

    // Categories
    if (path === "/categories") return db.mockCategories;
    if (seg[0] === "categories" && seg[1]) return db.mockCategories.find((c) => c.id === seg[1]) || db.mockCategories[0];

    // Brands
    if (path === "/brands") return db.mockBrands;
    if (seg[0] === "brands" && seg[1]) return db.mockBrands.find((b) => b.id === seg[1]) || db.mockBrands[0];

    // Collections
    if (path === "/collections") return db.mockCollections;
    if (seg[0] === "collections" && seg[1]) return db.mockCollections.find((c) => c.id === seg[1]) || db.mockCollections[0];

    // Coupons
    if (path === "/coupon") return db.mockCoupons;
    if (path === "/coupon/active") return db.mockCoupons.filter((c) => c.status === "active");
    if (seg[0] === "coupon" && seg[1]) return db.mockCoupons.find((c) => c.id === seg[1]) || db.mockCoupons[0];

    // Customers
    if (path === "/customers") return db.mockCustomers;
    if (seg[0] === "customers" && seg[1]) return db.mockCustomers.find((c) => c.id === seg[1]) || db.mockCustomers[0];

    // Reviews are served by the real backend now (see review.service.ts →
    // realApi). `db.mockReviews` stays put because the home-page builder still
    // seeds its testimonial section from it.

    // Logs
    if (path === "/logs") {
      const skip = Number(params.skip ?? 0);
      const take = Number(params.take ?? 20);
      let list = [...db.mockLogs];
      if (params.severity) list = list.filter((l) => l.severity === params.severity);
      if (params.status) list = list.filter((l) => l.status === params.status);
      if (params.source) list = list.filter((l) => l.source === params.source);
      if (params.search) {
        const q = String(params.search).toLowerCase();
        list = list.filter((l) => l.message.toLowerCase().includes(q));
      }
      return paginate(list, skip, take);
    }
    if (path === "/logs/export") return csvBlob(db.mockLogs);
    if (seg[0] === "logs" && seg[1]) return db.mockLogs.find((l) => l.id === seg[1]) || db.mockLogs[0];

    // Pages
    if (path === "/pages") return db.mockPages;
    if (seg[0] === "pages" && seg[1]) return db.mockPages.find((p) => p.id === seg[1] || p.slug === seg[1]) || db.mockPages[0];

    // Wallet (specific before generic /wallet/admin/:userId)
    if (path === "/wallet/admin/users") return db.mockWalletUsers;
    if (seg[0] === "wallet" && seg[1] === "admin" && seg[2] === "order-funding") return [];
    if (seg[0] === "wallet" && seg[1] === "admin" && seg[2] === "return-resolution") {
      return { order: { id: seg[3], status: "returned", onlineAmountPaid: 0, walletAmountUsed: 0, totalAmount: 0 }, eligible: false, eligibleRefundableAmount: 0, resolution: null };
    }
    if (seg[0] === "wallet" && seg[1] === "admin" && seg[2]) return db.mockWalletDetail(seg[2]);

    // Website
    if (path === "/website/home-sections/all") return db.mockHomeSections;
    if (path === "/website/about") return db.mockAbout;
    if (path === "/website/contact") return db.mockContactPage;

    // Profile
    if (path === "/profiles/me") return db.mockProfile;

    // Settings
    if (path === "/settings/admin" || path === "/settings") return db.mockSettings;
    if (path === "/settings/redis-stats") return db.mockRedisStats;
    if (path === "/settings/redis-keys") return db.mockRedisKeys;
    if (path === "/settings/storage/usage") return db.mockStorageUsage;
    if (seg[0] === "settings" && seg[1] === "notifications" && seg[2]) return db.mockNotificationSettings;

    // Notifications
    if (path === "/notifications") {
      const limit = params.limit ? Number(params.limit) : db.mockNotifications.length;
      return db.mockNotifications.slice(0, limit);
    }

    // Admin staff
    if (path === "/admin/staff") return db.mockAdminStaff;
    if (seg[0] === "admin" && seg[1] === "staff" && seg[2]) return db.mockAdminStaff.find((s) => s.id === seg[2]) || db.mockAdminStaff[0];

    // Contact submissions
    if (path === "/contact") {
      const type = String(params.type || "contact_us");
      return db.mockContacts[type] || [];
    }

    // Auth
    if (path === "/auth/me") return db.mockProfile.user;

    console.warn(`[mock-api] Unhandled GET ${path} — returning []`);
    return [];
  }

  // ---------------------------- POST / PATCH / PUT -------------------------
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    // Media uploads
    if (path === "/media/image" || path === "/media/video") {
      return {
        id: genId("media"),
        url: `https://placehold.co/600x600?text=Uploaded`,
        publicUrl: `https://placehold.co/600x600?text=Uploaded`,
        fileUrl: `https://placehold.co/600x600?text=Uploaded`,
        filename: `upload-${idCounter}.jpg`,
        size: 184320,
        mimeType: path.endsWith("video") ? "video/mp4" : "image/jpeg",
      };
    }
    if (path === "/media/bulk") {
      return { success: [{ id: genId("media"), url: `https://placehold.co/600x600?text=Uploaded`, publicUrl: `https://placehold.co/600x600?text=Uploaded`, filename: "bulk-1.jpg", size: 184320, mimeType: "image/jpeg" }], failed: [], totalUploaded: 1, totalFailed: 0 };
    }

    // Products
    if (path === "/products/bulk-status") {
      const ids = (body.productIds || []) as string[];
      return { updated: ids.length, alreadyActive: 0, alreadyDisabled: 0, notFound: 0, requested: ids.length };
    }

    // Coupon validate
    if (path === "/coupon/validate") {
      const code = String(body.couponCode || "").toUpperCase();
      const coupon = db.mockCoupons.find((c) => c.couponCode === code && c.status === "active");
      if (!coupon) return { valid: false, message: "Invalid or expired coupon", discountAmount: 0 };
      const discountAmount = coupon.discountType === "percentage" ? Math.round((body.subtotal || 0) * (coupon.discountAmount / 100)) : coupon.discountAmount;
      return { valid: true, message: "Coupon applied", discountAmount, couponCode: coupon.couponCode, discountType: coupon.discountType };
    }

    // Settings actions
    if (path === "/settings/reset-defaults") return { success: true, message: "Brand data reset successfully" };
    if (path === "/settings/clear-cache") return { success: true, message: "Cache cleared" };
    if (path === "/settings/storage/verify") return { success: true, message: "Storage connection OK" };
    if (path === "/settings/redis/verify") return { success: true, message: "Redis connection OK" };
    if (path === "/settings/verify-smtp") return { success: true, message: "SMTP connection OK" };

    // Logs clear
    if (path === "/logs/clear") return { success: true, deleted: (body.ids?.length ?? db.mockLogs.length) };

    // Website home-sections seed
    if (path === "/website/home-sections/seed") return { success: true, seeded: db.mockHomeSections.length };

    // Pages seed
    if (path === "/pages/seed") return { success: true, seeded: db.mockPages.length };

    // Orders lifecycle actions — echo the affected order id + success
    if (seg[0] === "orders") {
      const id = seg[1];
      return { success: true, id, ...body, updatedAt: nowISO() };
    }

    // Generic create/update echo: return the body merged with an id + timestamps,
    // so mutation onSuccess handlers reading the response render sensibly.
    const echoedId = seg[seg.length - 1] && !["status", "read", "read-all"].includes(seg[seg.length - 1])
      ? seg[seg.length - 1]
      : genId();
    if (method === "POST") {
      return { id: genId(seg[0] || "item"), ...body, createdAt: nowISO(), updatedAt: nowISO(), success: true };
    }
    return { id: echoedId, ...body, updatedAt: nowISO(), success: true };
  }

  // ------------------------------- DELETE ----------------------------------
  if (method === "DELETE") {
    return { success: true, message: "Deleted" };
  }

  return { success: true };
}
