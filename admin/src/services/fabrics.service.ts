import { AxiosInstance } from "axios";
import API_ENDPOINTS from "../config/endpoints";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, toPaginated, type PaginationParams } from "@/types/pagination";

// ---------------------------------------------------------------------------
// Fabrics service — the curated fabric pick-list, wired to the real NestJS
// backend (like products). Every call goes through `realApi`, NOT the mock
// axios; the mock instance from `useAxiosAuth()` is accepted for call-site
// compatibility but ignored on purpose.
//
// Products still store `fabric` as a plain string; this is just the managed
// set the product form's combobox offers ("pick one or type a new one").
// ---------------------------------------------------------------------------

/** A fabric as returned by the server (matches FabricResponseDto). */
export interface Fabric {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFabricDto {
  name: string;
  description?: string;
}

export type UpdateFabricDto = Partial<CreateFabricDto>;

/**
 * @param _api mock axios from `useAxiosAuth()` — accepted for call-site
 *   compatibility but intentionally unused; fabrics use `realApi`.
 */
export const fabricsService = (_api: AxiosInstance) => ({
  // One page of fabrics. Feeds both the fabrics table and the product form's
  // scroll-loaded fabric picker.
  async getAll(params?: PaginationParams): Promise<Paginated<Fabric>> {
    const response = await realApi.get(API_ENDPOINTS.fabrics.getAll, {
      params,
    });
    return toPaginated<Fabric>(response.data);
  },

  async create(data: CreateFabricDto): Promise<Fabric> {
    const response = await realApi.post<Fabric>(
      API_ENDPOINTS.fabrics.create,
      data,
    );
    return response.data;
  },

  async update(id: string, data: UpdateFabricDto): Promise<Fabric> {
    const response = await realApi.patch<Fabric>(
      API_ENDPOINTS.fabrics.update(id),
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<{ success: boolean; id: string }> {
    const response = await realApi.delete(API_ENDPOINTS.fabrics.delete(id));
    return response.data;
  },
});
