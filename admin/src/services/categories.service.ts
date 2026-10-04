import { realApi } from "@/lib/api/real-axios";
import API_ENDPOINTS from "@/config/endpoints";
import {
  MAX_PAGE_SIZE,
  Paginated,
  PaginationParams,
  toPaginated,
} from "@/types/pagination";

/**
 * Product categories — the REAL backend (server `Category` model).
 *
 * Previously this went through mockAxios against kaybykhushie's hierarchical
 * jewellery shape (`parent`/`parentId`/`productType`). Jakalburg stores a
 * product's category as one flat slug with gender held separately, so the
 * model is flat with a `genders` scope instead of a parent tree.
 *
 * Note what this table is NOT: it does not own products. `Product.category`
 * is still the source of truth for what a product is; these rows are the
 * editorial layer (display name, artwork, ordering, whether to offer it).
 */
export type CategoryGender = "women" | "men" | "unisex";

export interface Category {
  id: string;
  name: string;
  /** The value stored on products, e.g. "co-ord-sets". */
  slug: string;
  /** Empty means "any gender that has stock". */
  genders: CategoryGender[];
  description?: string | null;
  image?: string | null;
  isActive: boolean;
  order: number;
  /** Live products carrying this slug — server-derived. */
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryInput {
  name: string;
  slug?: string;
  genders?: CategoryGender[];
  description?: string | null;
  image?: string | null;
  isActive?: boolean;
  order?: number;
}

export const categoriesService = {
  /**
   * Admin table: ONE page of categories (10 by default), including inactive
   * rows and product counts. Search is applied server-side, so it matches rows
   * that aren't on the page currently displayed.
   */
  async getAll(params?: PaginationParams): Promise<Paginated<Category>> {
    const { data } = await realApi.get(API_ENDPOINTS.categories.adminList, {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search?.trim() || undefined,
      },
    });
    return toPaginated<Category>(data, params?.limit);
  },

  /**
   * Every category, for the filter dropdowns and pickers that have to offer
   * all of them at once. Capped at the server's max page size — a <select>
   * with more than 100 options has a bigger problem than pagination.
   */
  async listOptions(): Promise<Category[]> {
    const page = await this.getAll({ page: 1, limit: MAX_PAGE_SIZE });
    return page.data;
  },

  async getById(id: string): Promise<Category> {
    const { data } = await realApi.get<Category>(
      API_ENDPOINTS.categories.byId(id),
    );
    return data;
  },

  async create(input: CategoryInput): Promise<Category> {
    const { data } = await realApi.post<Category>(
      API_ENDPOINTS.categories.create,
      input,
    );
    return data;
  },

  async update(id: string, input: Partial<CategoryInput>): Promise<Category> {
    const { data } = await realApi.patch<Category>(
      API_ENDPOINTS.categories.update(id),
      input,
    );
    return data;
  },

  async delete(id: string): Promise<void> {
    await realApi.delete(API_ENDPOINTS.categories.delete(id));
  },
};
