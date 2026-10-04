"use client";

import { useMemo, useState } from "react";
import { TABLE_PAGE_SIZE } from "@/components/admin/table-pagination";

interface ClientPagination<T> {
  /** The rows for the current page — render these, not the full list. */
  pageRows: T[];
  /** 1-based, already clamped to the available range. */
  page: number;
  totalPages: number;
  /** Total rows *after* filtering, for the "Showing 1–10 of 125" line. */
  total: number;
  setPage: (page: number) => void;
  pageSize: number;
}

/**
 * Page a list the client already holds in full.
 *
 * For the few admin lists that genuinely arrive complete: a mock-backed screen
 * (delivery companies) or a short sub-list already embedded in a record
 * (coupon usage). These filter in the browser, so paging has to happen here too.
 *
 * Anything backed by a real list endpoint should page SERVER-side instead —
 * fetching every row to show ten is the thing this hook can't fix. Categories,
 * static pages and the contact inbox were moved off it for that reason; see
 * `useCategoriesPage` / `usePagesPage` for the shape to copy.
 *
 * Two corrections are applied so you can never end up staring at a blank table:
 *
 * - `resetKey` snaps back to page 1 when it changes. Pass whatever narrows the
 *   list (a search term, a status filter). Without it, searching from page 4
 *   leaves you on page 4 of a 1-page result.
 * - The returned `page` is clamped to `totalPages` on every render, which
 *   covers the list shrinking underneath you — deleting the last row of the
 *   last page, say. Clamping rather than resetting keeps you adjacent to where
 *   you were instead of flinging you back to the start.
 */
export function useClientPagination<T>(
  rows: T[],
  options: { pageSize?: number; resetKey?: unknown } = {},
): ClientPagination<T> {
  const { pageSize = TABLE_PAGE_SIZE, resetKey } = options;
  const [page, setPage] = useState(1);

  // Adjusting state during render rather than in an effect: React re-runs this
  // component immediately, before touching the DOM, so the table never paints
  // the wrong page first. An effect here would commit a stale page and then
  // cascade a second render.
  // https://react.dev/learn/you-might-not-need-an-effect
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setPage(1);
  }

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize],
  );

  return { pageRows, page: safePage, totalPages, total, setPage, pageSize };
}
