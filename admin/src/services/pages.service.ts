import API_ENDPOINTS from "../config/endpoints";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, PaginationParams, toPaginated } from "@/types/pagination";

/** One question/answer row inside a FAQ section. */
export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * A heading plus the Q&A that sits under it. This grouping is Jakalburg's own —
 * the kaybykhushie reference keeps a flat Q&A list. The storefront renders one
 * accordion per section, under the heading.
 */
export interface FaqSection {
  heading: string;
  items: FaqItem[];
}

export interface PageDto {
  id?: string;
  title: string;
  slug: string;
  /** Rich-text HTML from the Quill editor. Unused by the FAQ page. */
  content: string;
  /** FAQ page only — structured, so the editor round-trip stays lossless. */
  faqSections?: FaqSection[] | null;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

// Wired to the REAL backend (server `pages` module). Reads by slug are public;
// the admin list and every write are admin-only — realApi attaches the admin JWT.
export const pagesService = {
  /**
   * Admin table: ONE page of pages (10 by default), including inactive drafts.
   * Search is applied server-side over title and slug.
   */
  async getAll(params?: PaginationParams): Promise<Paginated<PageDto>> {
    const { data } = await realApi.get(API_ENDPOINTS.pages.getAll, {
      params: {
        page: params?.page,
        limit: params?.limit,
        search: params?.search?.trim() || undefined,
      },
    });
    return toPaginated<PageDto>(data, params?.limit);
  },

  async getById(id: string): Promise<PageDto> {
    const { data } = await realApi.get(API_ENDPOINTS.pages.getById(id));
    return data;
  },

  async getBySlug(slug: string): Promise<PageDto> {
    const { data } = await realApi.get(API_ENDPOINTS.pages.getBySlug(slug));
    return data;
  },

  async create(payload: PageDto): Promise<PageDto> {
    const { data } = await realApi.post(API_ENDPOINTS.pages.create, payload);
    return data;
  },

  async update(id: string, payload: Partial<PageDto>): Promise<PageDto> {
    const { data } = await realApi.patch(
      API_ENDPOINTS.pages.update(id),
      payload,
    );
    return data;
  },

  async delete(id: string): Promise<{ id: string }> {
    const { data } = await realApi.delete(API_ENDPOINTS.pages.delete(id));
    return data;
  },

  /** Creates any missing default page; never overwrites an edited one. */
  async seed(): Promise<{ seeded: number; total: number; message: string }> {
    const { data } = await realApi.post(API_ENDPOINTS.pages.seed);
    return data;
  },
};
