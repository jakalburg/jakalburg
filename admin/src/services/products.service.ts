import { AxiosInstance } from "axios";
import API_ENDPOINTS from "../config/endpoints";
import { realApi } from "@/lib/api/real-axios";

// ---------------------------------------------------------------------------
// Products service — the FIRST entity wired to the real NestJS backend.
//
// Every call goes through `realApi` (see @/lib/api/real-axios), NOT the mock
// axios the rest of the admin still uses. Call sites keep passing the mock
// instance from `useAxiosAuth()` for signature compatibility, but it is ignored
// here on purpose — this is the single seam that flips products onto the real DB
// while leaving orders/categories/brands/etc. on the mock layer.
//
// The server speaks the LEAN storefront Product model (title, gender, price in
// whole INR, colors[{name,hex}], images as URL strings, isActive, …). The admin
// UI was built for a richer shape (name, sku, listPrice, media[], quantity, …),
// so `toAdminProduct` maps a lean product into the fields the table / detail /
// form already read. Writes go the other way: the lean product form emits the
// lean DTO below, so create/update are essentially pass-through.
// ---------------------------------------------------------------------------

/** One colour option (matches the server's ProductColor: name + CSS hex). */
export interface ProductColorInput {
  name: string;
  hex: string;
  position?: number;
}

/** Lean create payload — mirrors server CreateProductDto 1:1. */
export interface CreateProductDto {
  title: string;
  slug?: string;
  gender: "women" | "men" | "unisex";
  category: string;
  price: number; // whole INR
  compareAtPrice?: number | null;
  images?: string[];
  sizes?: string[];
  soldOutSizes?: string[];
  tags?: string[];
  isNew?: boolean;
  onSale?: boolean;
  collection?: string | null;
  essential?: boolean;
  description: string;
  fabric: string;
  care: string;
  stock?: number;
  isActive?: boolean;
  colors?: ProductColorInput[];
}

export type UpdateProductDto = Partial<CreateProductDto>;

export type ProductSortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "stock-asc"
  | "stock-desc"
  | "popular";

/** The lean product as returned by the server. */
interface LeanProduct {
  id: string;
  slug: string;
  title: string;
  gender: "women" | "men" | "unisex";
  category: string;
  price: number;
  compareAtPrice?: number | null;
  images?: string[];
  colors?: { name: string; hex: string }[];
  sizes?: string[];
  soldOutSizes?: string[];
  tags?: string[];
  isNew?: boolean;
  onSale?: boolean;
  collection?: string | null;
  essential?: boolean;
  description?: string;
  fabric?: string;
  care?: string;
  stock?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Map a lean server product into the shape the admin UI reads. Keeps the lean
 * fields (title, gender, images[], colors[], sizes[], …) AND adds the aliases
 * the existing table / detail page expect (name, originalPrice, discountPrice,
 * quantity, media[], img, thumbnail, inStock, …).
 */
function toAdminProduct(p: LeanProduct): any {
  const images = Array.isArray(p.images) ? p.images : [];
  const stock = p.stock ?? 0;
  const hasCompare =
    typeof p.compareAtPrice === "number" && p.compareAtPrice > p.price;

  return {
    ...p,
    // aliases the table/detail/form read
    name: p.title,
    originalPrice: hasCompare ? p.compareAtPrice : p.price,
    discountPrice: hasCompare ? p.price : undefined,
    listPrice: hasCompare ? p.compareAtPrice : undefined,
    currency: "INR",
    quantity: stock,
    stockQuantity: stock,
    inStock: stock > 0,
    isActive: p.isActive ?? true,
    sku: "",
    tags: p.tags ?? [],
    // image aliases: keep lean `images` (string[]) AND synthesize a `media[]`
    // array so the detail page's gallery (which reads media[].publicUrl) works.
    imageUrls: images,
    img: images[0],
    thumbnail: images[0],
    media: images.map((url, i) => ({
      id: `${p.id}-img-${i}`,
      fileName: "",
      fileSize: 0,
      mediaType: "image" as const,
      mimeType: "image/*",
      publicUrl: url,
    })),
  };
}

/** Server list envelope → same envelope with mapped items. */
function mapListEnvelope(raw: any) {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return {
    data: data.map((p: LeanProduct) => toAdminProduct(p)),
    total: raw?.total ?? data.length,
    skip: raw?.skip ?? 0,
    take: raw?.take ?? data.length,
    hasMore: raw?.hasMore ?? false,
  };
}

/**
 * @param _api mock axios from `useAxiosAuth()` — accepted for call-site
 *   compatibility but intentionally unused; products use `realApi`.
 */
export const productsService = (_api: AxiosInstance) => ({
  // Paginated list. Returns { data, total, skip, take, hasMore }.
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: ProductSortOption;
    category?: string;
    status?: "all" | "active" | "disabled";
    isStealDeal?: boolean; // ignored (not in the lean model)
  }) {
    // Steal-deal bundles don't exist in the lean catalogue — return empty so the
    // steal-deals screen shows a clean "none" state instead of the full catalogue.
    if (params?.isStealDeal) {
      return { data: [], total: 0, skip: 0, take: params?.limit ?? 10, hasMore: false };
    }

    const limit = params?.limit ?? 10;
    const page = params?.page ?? 1;
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

    const response = await realApi.get(API_ENDPOINTS.products.getAll, {
      params: {
        skip,
        take: limit,
        sort: params?.sort,
        category:
          params?.category && params.category !== "all"
            ? params.category
            : undefined,
        // 'all' → omit so the server returns active + hidden together.
        status: params?.status && params.status !== "all" ? params.status : undefined,
        search: search || undefined,
      },
    });
    return mapListEnvelope(response.data);
  },

  // Distinct category slugs across the catalogue — feeds the product form's
  // category combobox ("select an existing category or type a new one").
  async getCategories(): Promise<string[]> {
    const response = await realApi.get<string[]>(
      API_ENDPOINTS.products.categories,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  // Free-text search — returns { data } of mapped products.
  async search(query: string) {
    if (!query) return { data: [] };
    const response = await realApi.get(API_ENDPOINTS.products.search, {
      params: { query },
    });
    return { data: mapListEnvelope(response.data).data };
  },

  // Single product (admin view — includes hidden).
  async getById(id: string) {
    const response = await realApi.get(API_ENDPOINTS.products.getById(id));
    return toAdminProduct(response.data);
  },

  // Create.
  async create(data: CreateProductDto) {
    const response = await realApi.post(API_ENDPOINTS.products.create, data);
    return toAdminProduct(response.data);
  },

  // Update (partial).
  async update(id: string, data: UpdateProductDto) {
    const response = await realApi.patch(API_ENDPOINTS.products.update(id), data);
    return toAdminProduct(response.data);
  },

  // Toggle storefront visibility.
  async updateStatus(id: string, isActive: boolean) {
    const response = await realApi.patch(
      API_ENDPOINTS.products.updateStatus(id),
      { isActive },
    );
    return toAdminProduct(response.data);
  },

  // Bulk enable/disable. Server returns { count }; normalise to the richer
  // summary shape the table's toast reads.
  async bulkUpdateStatus(productIds: string[], isActive: boolean) {
    const response = await realApi.patch(API_ENDPOINTS.products.bulkStatus, {
      productIds,
      isActive,
    });
    const count = response.data?.count ?? 0;
    const requested = productIds.length;
    return {
      updated: count,
      alreadyActive: 0,
      alreadyDisabled: 0,
      notFound: Math.max(0, requested - count),
      requested,
    };
  },

  // Delete (colours cascade on the server).
  async delete(id: string) {
    const response = await realApi.delete(API_ENDPOINTS.products.delete(id));
    return response.data;
  },

  // Related products. The lean server exposes related-by-slug only; the admin
  // detail page already renders relatedProducts from getById, so this is a
  // best-effort no-op that never throws.
  async getRelated(_id: string) {
    return [] as any[];
  },
});
