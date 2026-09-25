import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { apiFetch } from "@/lib/api-client";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  REVIEW_PAGE_SIZE,
  toPaginated,
  toQueryString,
  type Paginated,
} from "@/lib/pagination";
import { useAppSelector } from "@/redux/hooks";
import { selectIsAuthenticated } from "@/redux/features/auth-slice";
import type { MyReview, ProductReviewSummary } from "@/types";

/**
 * A single order can only hold so many line items, and the order detail page
 * only ever reads one order's reviews — so one bounded page covers it.
 */
const MY_REVIEWS_PAGE_SIZE = 100;

const E = API_ENDPOINTS.reviews;

export const productReviewsKey = (slug: string) => ["reviews", "product", slug] as const;
export const myReviewsKey = ["reviews", "mine"] as const;

/** Longest comment the server accepts (mirrors REVIEW_COMMENT_MAX on the API). */
export const REVIEW_COMMENT_MAX = 1000;

/**
 * Approved reviews + rating summary for a product. Public — no auth needed.
 *
 * The review list is loaded a page at a time and appended on "Show more"; the
 * summary fields (`average`, `count`, `distribution`) are computed server-side
 * across every approved review, so they're correct from the first page.
 */
export function useProductReviews(slug: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: productReviewsKey(slug ?? ""),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiFetch<ProductReviewSummary>(
        `${E.forProduct(slug!)}${toQueryString({
          page: pageParam,
          limit: REVIEW_PAGE_SIZE,
        })}`,
      ),
    getNextPageParam: (last) =>
      last.hasMore ? (last.page ?? 1) + 1 : undefined,
    enabled: Boolean(slug),
  });

  const first = query.data?.pages[0];
  const reviews = useMemo(
    () => query.data?.pages.flatMap((p) => p.reviews ?? []) ?? [],
    [query.data],
  );

  return {
    ...query,
    /** Summary from the first page — the aggregates cover every review. */
    summary: first
      ? { ...first, reviews }
      : undefined,
    reviews,
  };
}

/**
 * The signed-in user's own reviews, in any status.
 *
 * The order detail page passes `orderNumber` so it fetches only that order's
 * reviews — it uses them to decide what each line item offers (write / pending
 * / approved / rejected), and a bounded read is enough for that. Must reflect a
 * just-submitted review immediately, hence `refetchOnMount: "always"`.
 */
export function useMyReviews(orderNumber?: string) {
  const isAuth = useAppSelector(selectIsAuthenticated);
  return useQuery({
    queryKey: [...myReviewsKey, orderNumber ?? "all"],
    queryFn: () =>
      apiFetch<Paginated<MyReview> | MyReview[]>(
        `${E.mine}${toQueryString({
          orderNumber,
          limit: MY_REVIEWS_PAGE_SIZE,
        })}`,
        { auth: true },
      ).then((raw) => toPaginated<MyReview>(raw, MY_REVIEWS_PAGE_SIZE).data),
    enabled: isAuth,
    refetchOnMount: "always",
  });
}

export interface CreateReviewInput {
  /** Public order number (e.g. "JB-284917"), not the internal row id. */
  orderNumber: string;
  productId: string;
  rating: number;
  comment?: string;
}

// Write a review. The server re-checks ownership, delivery and that the order
// actually contained the product, so a rejected attempt surfaces as an ApiError
// with a human-readable message the dialog can show as-is.
export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReviewInput) =>
      apiFetch<MyReview>(E.create, { method: "POST", body, auth: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myReviewsKey });
    },
  });
}

// Edit a pending review. Approved ones are frozen server-side (403).
export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: { id: string; rating?: number; comment?: string }) =>
      apiFetch<MyReview>(E.update(id), { method: "PATCH", body, auth: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myReviewsKey });
    },
  });
}

// Withdraw a pending review.
export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(E.delete(id), { method: "DELETE", auth: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: myReviewsKey });
    },
  });
}
