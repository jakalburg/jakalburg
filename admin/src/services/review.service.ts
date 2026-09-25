import { AxiosInstance } from "axios";
import API_ENDPOINTS from "@/config/endpoints";
import { realApi } from "@/lib/api/real-axios";
import { Paginated, toPaginated } from "@/types/pagination";

// ---------------------------------------------------------------------------
// Reviews service — wired to the real NestJS backend (like coupons/products/…).
//
// Every call goes through `realApi`, NOT the mock axios. Call sites still pass
// the mock instance from `useAxiosAuth()` for signature compatibility, but it is
// ignored here on purpose.
//
// Unlike coupons, there is no shape translation: the admin speaks the server's
// own review vocabulary (`pending | approved | rejected`) end to end.
// ---------------------------------------------------------------------------

export type ReviewStatus = "pending" | "approved" | "rejected";

interface ReviewProfile {
  firstName?: string | null;
  lastName?: string | null;
}

export interface Review {
  id: string;
  /** Absent when the review was added here under a free-text author name. */
  userId?: string;
  productId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  /**
   * The delivered order that entitled this review. Absent on reviews added from
   * this dashboard — that's what tells the two kinds apart in the list.
   */
  orderNumber?: string;
  /** Resolved display name: admin override if set, else the customer's profile. */
  authorName: string;
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
    slug?: string;
    thumbnail?: string;
  };
}

/** Payload for a review written here rather than by a customer. */
export interface CreateReviewInput {
  productId: string;
  rating: number;
  comment?: string;
  /** Display name. Required unless `userId` is given; wins when both are. */
  authorName?: string;
  /** Attribute the review to a real customer instead of / alongside a name. */
  userId?: string;
  /** ISO timestamp. Omit for "now". */
  createdAt?: string;
  /** Defaults to `approved` server-side. */
  status?: ReviewStatus;
}

/** Add the same review to several products at once (or the whole catalogue). */
export interface BulkCreateReviewInput {
  /** Explicit targets. Ignored when `all` is true; required otherwise. */
  productIds?: string[];
  /** Apply to every product. Overrides `productIds`. */
  all?: boolean;
  rating: number;
  comment?: string;
  authorName?: string;
  userId?: string;
  createdAt?: string;
  status?: ReviewStatus;
}

/** Show/hide reviews for a set of products (or the whole catalogue). */
export interface SetReviewDisplayInput {
  productIds?: string[];
  all?: boolean;
  /** true → hide reviews + rating on the storefront; false → show them. */
  hidden: boolean;
}

/**
 * @param _api mock axios from `useAxiosAuth()` — accepted for call-site
 *   compatibility but intentionally unused; reviews use `realApi`.
 */
export const reviewService = (_api: AxiosInstance) => ({
  /** All reviews, newest first. Pass a status to filter server-side. */
  /** One page of reviews. Status filter and free-text search run server-side. */
  async getAll(params?: {
    status?: ReviewStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Paginated<Review>> {
    const response = await realApi.get(API_ENDPOINTS.reviews.all, { params });
    return toPaginated<Review>(response.data);
  },

  /**
   * Add a review to a product from the dashboard — for seeding a page that has
   * no organic reviews yet. No order backs it. Unless a status is passed it is
   * created already approved, so it publishes and counts toward the average
   * immediately.
   */
  async create(input: CreateReviewInput): Promise<Review> {
    const response = await realApi.post<Review>(API_ENDPOINTS.reviews.create, {
      productId: input.productId,
      rating: input.rating,
      comment: input.comment?.trim() || undefined,
      authorName: input.authorName?.trim() || undefined,
      userId: input.userId || undefined,
      createdAt: input.createdAt || undefined,
      status: input.status || undefined,
    });
    return response.data;
  },

  /**
   * Add the same review to many products at once — for seeding a batch of pages.
   * Pass `all: true` to hit the whole catalogue instead of listing every id.
   * Returns how many reviews were created.
   */
  async bulkCreate(input: BulkCreateReviewInput): Promise<{ created: number }> {
    const response = await realApi.post<{ created: number }>(
      API_ENDPOINTS.reviews.bulkCreate,
      {
        productIds: input.all ? undefined : input.productIds,
        all: input.all || undefined,
        rating: input.rating,
        comment: input.comment?.trim() || undefined,
        authorName: input.authorName?.trim() || undefined,
        userId: input.userId || undefined,
        createdAt: input.createdAt || undefined,
        status: input.status || undefined,
      },
    );
    return response.data;
  },

  /**
   * Show or hide reviews for a set of products (or the whole catalogue). Flips
   * the storefront's per-product visibility; the review data is kept either way.
   * Returns how many products were updated.
   */
  async setDisplay(input: SetReviewDisplayInput): Promise<{ updated: number }> {
    const response = await realApi.patch<{ updated: number }>(
      API_ENDPOINTS.reviews.setDisplay,
      {
        productIds: input.all ? undefined : input.productIds,
        all: input.all || undefined,
        hidden: input.hidden,
      },
    );
    return response.data;
  },

  /**
   * Approve or reject. The server recomputes the product's average rating and
   * review count either way, so approving publishes the stars and rejecting
   * pulls them back out of the aggregate.
   */
  async setStatus(id: string, status: ReviewStatus): Promise<Review> {
    const response = await realApi.patch<Review>(
      API_ENDPOINTS.reviews.updateStatus(id),
      { status },
    );
    return response.data;
  },

  /** Hard delete — allowed at any status (there is no soft-delete column). */
  async delete(id: string): Promise<void> {
    await realApi.delete(API_ENDPOINTS.reviews.delete(id));
  },
});
