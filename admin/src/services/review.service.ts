import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";

interface ReviewProfile {
  firstName?: string | null;
  lastName?: string | null;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email?: string | null;
    image?: string | null;
    profiles?: ReviewProfile[];
  };
  product?: {
    id: string;
    name: string;
    thumbnail?: string;
  };
}

export const reviewService = (api: AxiosInstance) => ({
  async getAll(): Promise<Review[]> {
    const response = await api.get(API_ENDPOINTS.reviews.all);
    return response.data;
  },

  async update(
    id: string,
    data: Partial<Pick<Review, "status" | "rating" | "comment">>,
  ): Promise<Review> {
    const response = await api.patch(API_ENDPOINTS.reviews.update(id), data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.reviews.delete(id));
  },
});
