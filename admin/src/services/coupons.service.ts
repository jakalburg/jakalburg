import { AxiosInstance } from "axios";

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

export const couponsService = (api: AxiosInstance) => ({
  // Get all coupons
  async getAll(): Promise<Coupon[]> {
    const response = await api.get("/coupon");
    return response.data;
  },

  // Get active coupons
  async getActive(): Promise<Coupon[]> {
    const response = await api.get("/coupon/active");
    return response.data;
  },

  // Get single coupon
  async getById(id: string): Promise<Coupon> {
    const response = await api.get(`/coupon/${id}`);
    return response.data;
  },

  // Create coupon
  async create(data: Partial<Coupon>): Promise<Coupon> {
    const response = await api.post("/coupon", data);
    return response.data;
  },

  // Update coupon
  async update(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const response = await api.patch(`/coupon/${id}`, data);
    return response.data;
  },

  // Delete coupon (soft delete - sets status to inactive)
  async delete(id: string): Promise<void> {
    await api.delete(`/coupon/${id}`);
  },

  // Validate coupon
  async validate(data: {
    couponCode: string;
    cartItems: any[];
    subtotal: number;
  }): Promise<{
    valid: boolean;
    message: string;
    discountAmount: number;
    couponCode?: string;
    discountType?: string;
  }> {
    const response = await api.post("/coupon/validate", data);
    return response.data;
  },
});
