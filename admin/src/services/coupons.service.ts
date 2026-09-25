import { AxiosInstance } from "axios";
import API_ENDPOINTS from "../config/endpoints";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, toPaginated, type PaginationParams } from "@/types/pagination";

// ---------------------------------------------------------------------------
// Coupons service — wired to the real NestJS backend (like products/fabrics/…).
//
// Every call goes through `realApi`, NOT the mock axios. Call sites still pass
// the mock instance from `useAxiosAuth()` for signature compatibility, but it is
// ignored here on purpose.
//
// The server speaks a clean REST shape (`code`, `isActive`, `endDate` as ISO,
// no `productType`). The admin UI (list / create / edit forms) was built around
// `couponCode`, `status: "active" | "inactive"` and an optional `productType`,
// so this seam maps between the two in BOTH directions — reads via
// `toAdminCoupon`, writes via `toServerPayload`.
// ---------------------------------------------------------------------------

export interface Coupon {
  id: string;
  couponCode: string;
  discountType: "percentage" | "fixed";
  discountAmount: number;
  minimumAmount: number;
  endDate: string;
  status: "active" | "inactive";
  logo?: string;
  usageCount?: number;
  maxUsage?: number;
  productType?: string;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** The customer who placed an order that redeemed a coupon. */
export interface CouponUsageUser {
  id: string;
  name: string;
  email: string;
}

/** One order that redeemed a coupon (reconstructed from Order.couponCode). */
export interface CouponUsageRow {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  discount: number;
  /** null for a guest order with no linked user. */
  user: CouponUsageUser | null;
}

/** A coupon plus every order that has redeemed it (newest first). */
export interface CouponUsage {
  coupon: Coupon;
  usage: CouponUsageRow[];
}

/** The coupon shape the server returns. */
interface ServerCoupon {
  id: string;
  code: string;
  title?: string | null;
  discountType: "percentage" | "fixed";
  discountAmount: number;
  minimumAmount: number;
  productType?: string | null;
  endDate?: string | null;
  isActive: boolean;
  maxUsage?: number | null;
  usageCount: number;
  logo?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Server coupon → the `Coupon` shape the admin table / forms read. */
function toAdminCoupon(c: ServerCoupon): Coupon {
  return {
    id: c.id,
    couponCode: c.code,
    title: c.title ?? "",
    discountType: c.discountType,
    discountAmount: c.discountAmount,
    minimumAmount: c.minimumAmount,
    endDate: c.endDate ?? "",
    status: c.isActive ? "active" : "inactive",
    logo: c.logo ?? undefined,
    maxUsage: c.maxUsage ?? undefined,
    usageCount: c.usageCount,
    // Informational label stored on the coupon (not enforced at checkout).
    productType: c.productType ?? "all",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Admin form values → the server's create/update payload. Only defined fields
 *  are sent, so a partial edit patches just those columns. `productType` is an
 *  informational label (persisted, but not enforced at checkout). */
function toServerPayload(data: Partial<Coupon>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.couponCode !== undefined) payload.code = data.couponCode;
  if (data.title !== undefined) payload.title = data.title;
  if (data.discountType !== undefined) payload.discountType = data.discountType;
  if (data.discountAmount !== undefined)
    payload.discountAmount = Number(data.discountAmount);
  if (data.minimumAmount !== undefined)
    payload.minimumAmount = Number(data.minimumAmount);
  if (data.productType !== undefined) payload.productType = data.productType;
  if (data.endDate !== undefined)
    payload.endDate = data.endDate
      ? new Date(data.endDate).toISOString()
      : undefined;
  if (data.status !== undefined) payload.isActive = data.status === "active";
  if (data.maxUsage !== undefined)
    payload.maxUsage =
      data.maxUsage === undefined || (data.maxUsage as unknown) === ""
        ? undefined
        : Number(data.maxUsage);
  if (data.logo !== undefined) payload.logo = data.logo || undefined;
  return payload;
}

/**
 * @param _api mock axios from `useAxiosAuth()` — accepted for call-site
 *   compatibility but intentionally unused; coupons use `realApi`.
 */
export const couponsService = (_api: AxiosInstance) => ({
  // One page of coupons. Search runs server-side.
  async getAll(params?: PaginationParams): Promise<Paginated<Coupon>> {
    const response = await realApi.get(API_ENDPOINTS.coupons.getAll, {
      params,
    });
    const page = toPaginated<ServerCoupon>(response.data);
    return { ...page, data: page.data.map(toAdminCoupon) };
  },

  // Active, non-expired coupons — derived from the first page (no dedicated
  // server route). Kept for call-site compatibility.
  async getActive(): Promise<Coupon[]> {
    const { data: all } = await this.getAll({ limit: 100 });
    const now = Date.now();
    return all.filter(
      (c) =>
        c.status === "active" &&
        (!c.endDate || new Date(c.endDate).getTime() >= now),
    );
  },

  async getById(id: string): Promise<Coupon> {
    const response = await realApi.get<ServerCoupon>(
      API_ENDPOINTS.coupons.getById(id),
    );
    return toAdminCoupon(response.data);
  },

  // The coupon + every order that redeemed it (server reconstructs usage from
  // Order.couponCode). Coupon is mapped to the admin shape; rows pass through.
  async getUsage(id: string): Promise<CouponUsage> {
    const response = await realApi.get<{
      coupon: ServerCoupon;
      usage: CouponUsageRow[];
    }>(API_ENDPOINTS.coupons.usage(id));
    return {
      coupon: toAdminCoupon(response.data.coupon),
      usage: response.data.usage,
    };
  },

  async create(data: Partial<Coupon>): Promise<Coupon> {
    const response = await realApi.post<ServerCoupon>(
      API_ENDPOINTS.coupons.create,
      toServerPayload(data),
    );
    return toAdminCoupon(response.data);
  },

  async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const response = await realApi.patch<ServerCoupon>(
      API_ENDPOINTS.coupons.update(id),
      toServerPayload(data),
    );
    return toAdminCoupon(response.data);
  },

  // Hard delete on the server (there is no soft-delete column).
  async delete(id: string): Promise<void> {
    await realApi.delete(API_ENDPOINTS.coupons.delete(id));
  },

  // Validate a code against a subtotal (server prices the discount). The admin
  // doesn't call this today, but the storefront checkout does via its own client.
  async validate(data: {
    couponCode: string;
    cartItems?: unknown[];
    subtotal: number;
  }): Promise<{
    valid: boolean;
    message: string;
    discountAmount: number;
    couponCode?: string;
    discountType?: string;
  }> {
    const response = await realApi.post(API_ENDPOINTS.coupons.validate, {
      code: data.couponCode,
      subtotal: data.subtotal,
    });
    return response.data;
  },
});
