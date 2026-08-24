import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Collections service — the storefront's editorial collections ("Shop by
// mood"), wired to the real NestJS backend (like products/fabrics). Every call
// goes through `realApi`; the mock axios from `useAxiosAuth()` is accepted for
// call-site compatibility but ignored on purpose.
//
// Membership lives on the product (Product.collections = array of collection
// slugs), so `productCount` is derived server-side. The cover photo is uploaded
// via the shared uploads service (Cloudinary) and stored here as a plain URL.
// ---------------------------------------------------------------------------

/** A collection as returned by the server (matches CollectionResponseDto). */
export interface Collection {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  description?: string | null;
  enabled: boolean;
  order: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionDto {
  title: string;
  slug?: string;
  subtitle?: string;
  image?: string;
  description?: string;
  enabled?: boolean;
  order?: number;
}

export type UpdateCollectionDto = Partial<CreateCollectionDto>;

/**
 * @param _api mock axios from `useAxiosAuth()` — accepted for call-site
 *   compatibility but intentionally unused; collections use `realApi`.
 */
export const collectionsService = (_api: AxiosInstance) => ({
  async getAll(): Promise<Collection[]> {
    const response = await realApi.get<Collection[]>(
      API_ENDPOINTS.collections.all,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async getById(id: string): Promise<Collection> {
    const response = await realApi.get<Collection>(
      API_ENDPOINTS.collections.byId(id),
    );
    return response.data;
  },

  async create(data: CreateCollectionDto): Promise<Collection> {
    const response = await realApi.post<Collection>(
      API_ENDPOINTS.collections.create,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateCollectionDto): Promise<Collection> {
    const response = await realApi.patch<Collection>(
      API_ENDPOINTS.collections.update(id),
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const response = await realApi.delete(API_ENDPOINTS.collections.delete(id));
    return response.data;
  },
});
