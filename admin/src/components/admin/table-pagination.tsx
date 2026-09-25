"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Rows per page for every admin table. */
export const TABLE_PAGE_SIZE = 10;

interface TablePaginationProps {
  /** 1-based current page. */
  currentPage: number;
  /** Total pages available (from the server's `totalPages`/`total`). */
  totalPages: number;
  /** Total matching rows, for the "Showing 1–10 of 125" line. */
  total: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the count line, e.g. "orders". */
  itemLabel?: string;
  /** Rows per page — only used to compute the displayed range. */
  pageSize?: number;
}

/**
 * Compact page navigation shared by every admin table.
 *
 * Renders first/last plus a window around the current page, collapsing the rest
 * behind ellipses, so a 60-page table doesn't paint 60 buttons. Returns null
 * when everything fits on one page — a lone "[1]" is just noise.
 */
export function TablePagination({
  currentPage,
  totalPages,
  total,
  onPageChange,
  itemLabel = "items",
  pageSize = TABLE_PAGE_SIZE,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = Math.min((currentPage - 1) * pageSize + 1, total);
  const to = Math.min(currentPage * pageSize, total);

  // First page, last page and the immediate neighbours of the current one;
  // gaps between those become a single ellipsis.
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(
      (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1,
    )
    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 py-3">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{from}</span> –{" "}
        <span className="font-medium">{to}</span> of{" "}
        <span className="font-medium">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <div className="flex items-center gap-1 flex-wrap">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-muted-foreground text-sm"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
