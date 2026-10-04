"use client";

import { CheckCircle2, Search, Trash2, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reviewService,
  type Review,
  type ReviewStatus,
} from "@/services/review.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/admin/table-pagination";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tabs across the top of the list. "Pending" leads because it is the only one
// that needs action — everything else is a record.
const FILTERS: { label: string; value: ReviewStatus | "all" }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

const STATUS_BADGE: Record<
  ReviewStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  approved: { label: "Approved", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
};

function ReviewStatusBadge({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <Badge className={className} variant={badge.variant}>
      {badge.label}
    </Badge>
  );
}

export function ReviewsTab() {
  const [filter, setFilter] = useState<ReviewStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // The id currently being approved/rejected, so only that row's buttons show
  // a busy state rather than the whole table locking up.
  const [movingId, setMovingId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: ["reviews", filter, debouncedSearch, page],
    queryFn: () =>
      reviewService(api).getAll({
        status: filter === "all" ? undefined : filter,
        search: debouncedSearch.trim() || undefined,
        page,
        limit: TABLE_PAGE_SIZE,
      }),
    // Holds the totals steady so the pagination control doesn't jump while the
    // next page loads. The ROWS are not shown stale — see `isPageLoading`.
    placeholderData: (previous) => previous,
  });

  const reviews = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // `isPlaceholderData` means these rows still belong to the previous page or
  // filter, so the table shows its loading state until the real page lands.
  const isPageLoading = isLoading || isPlaceholderData;

  // A changed status filter or search term invalidates the current page.
  useEffect(() => {
    setPage(1);
  }, [filter, debouncedSearch]);

  // Invalidate the whole "reviews" tree, not just the active filter — a review
  // that moves from pending to approved changes two lists at once.
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["reviews"] });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewService(api).delete(id),
    onSuccess: () => {
      invalidate();
      toast.success("Review deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReviewStatus }) =>
      reviewService(api).setStatus(id, status),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.status === "approved"
          ? "Review approved — it's now live on the product page"
          : "Review rejected",
      );
    },
    onError: () => {
      toast.error("Failed to update the review");
    },
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetStatus = async (id: string, status: ReviewStatus) => {
    setMovingId(id);
    try {
      await statusMutation.mutateAsync({ id, status });
    } finally {
      setMovingId(null);
    }
  };

  const stopActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  // The server already resolves the display name (admin override, else the
  // linked profile), so prefer that and only fall back for older payloads.
  const getCustomerName = (review: Review) => {
    const profile = review.user?.profiles?.[0];
    return (
      review.authorName ||
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
      review.user?.email?.split("@")[0] ||
      "Unknown User"
    );
  };

  /** Reviews added from this dashboard have no order behind them. */
  const isAdminAuthored = (review: Review) => !review.orderNumber;

  const formatDate = (date?: string) => {
    if (!date) return "N/A";

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const columns = [
    {
      header: "Product",
      className: "w-[250px]",
      cell: (review: Review) => (
        <div className="flex items-center gap-3">
          <ImageShimmer
            src={review.product?.thumbnail}
            alt={review.product?.name}
            wrapperClassName="w-10 h-10 rounded-md border border-input flex-shrink-0"
          />
          <div
            className="font-medium text-sm truncate max-w-[150px]"
            title={review.product?.name}
          >
            {review.product?.name || "Unknown Product"}
          </div>
        </div>
      ),
    },
    {
      header: "Author",
      cell: (review: Review) => (
        <div className="text-sm">
          <div className="font-medium">{getCustomerName(review)}</div>
          <div className="text-xs text-muted-foreground">
            {review.user?.email ||
              (isAdminAuthored(review) ? "Not a customer account" : "No email")}
          </div>
        </div>
      ),
    },
    {
      header: "Source",
      className: "w-[140px]",
      cell: (review: Review) =>
        isAdminAuthored(review) ? (
          <Badge variant="outline" title="Added from this dashboard">
            Added by admin
          </Badge>
        ) : (
          <span
            className="font-mono text-xs text-muted-foreground"
            title="Written by the customer off this delivered order"
          >
            {review.orderNumber}
          </span>
        ),
    },
    {
      header: "Rating",
      className: "w-[110px]",
      cell: (review: Review) => (
        <div className="flex items-center text-amber-500">
          <Star className="w-4 h-4 fill-current" />
          <span className="ml-1 text-sm font-medium text-foreground">
            {review.rating} / 5
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      className: "w-[110px]",
      cell: (review: Review) => <ReviewStatusBadge status={review.status} />,
    },
    {
      header: "Comment",
      cell: (review: Review) => (
        <button
          type="button"
          className="max-w-[300px] truncate text-left text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
          title="View full review"
          onClick={() => setSelectedReview(review)}
        >
          {review.comment || <span className="italic">No written comment</span>}
        </button>
      ),
    },
    {
      header: "Actions",
      className: "w-[210px]",
      cell: (review: Review) => {
        const busy = movingId === review.id;
        return (
          <div className="flex items-center gap-1">
            {review.status !== "approved" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={(event) => {
                  stopActionClick(event);
                  handleSetStatus(review.id, "approved");
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            )}
            {review.status !== "rejected" && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={(event) => {
                  stopActionClick(event);
                  handleSetStatus(review.id, "rejected");
                }}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deletingId === review.id}
                  onClick={stopActionClick}
                >
                  {deletingId === review.id ? (
                    "Deleting..."
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={stopActionClick}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently remove the
                    review and recalculate the product&apos;s average rating. To
                    keep a record instead, reject it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(review.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews, authors, products…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <DataTable
          title="Customer Reviews"
          data={reviews}
          columns={columns}
          isLoading={isPageLoading}
          error={error}
          emptyMessage={
            debouncedSearch.trim()
              ? `No reviews match "${debouncedSearch.trim()}".`
              : filter === "pending"
                ? "Nothing waiting for approval."
                : "No reviews in this state."
          }
          getRowKey={(review) => review.id}
          onRowClick={setSelectedReview}
        />
      </div>

      {!isLoading && !error && (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="reviews"
        />
      )}

      <Dialog
        open={Boolean(selectedReview)}
        onOpenChange={(open) => {
          if (!open) setSelectedReview(null);
        }}
      >
        <DialogContent
          className="overflow-hidden sm:max-w-md"
          style={{ width: "min(520px, calc(100vw - 2rem))", maxWidth: 520 }}
        >
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Product
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {selectedReview.product?.name || "Unknown Product"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <ReviewStatusBadge
                    className="mt-2"
                    status={selectedReview.status}
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Author
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {getCustomerName(selectedReview)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-2 break-all text-sm font-medium">
                    {selectedReview.user?.email ||
                      (isAdminAuthored(selectedReview)
                        ? "Not a customer account"
                        : "No email")}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rating
                  </p>
                  <div className="mt-2 flex items-center text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="ml-1 text-sm font-medium text-foreground">
                      {selectedReview.rating} / 5
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {isAdminAuthored(selectedReview) ? (
                      "Added by admin"
                    ) : (
                      <span className="font-mono">
                        {selectedReview.orderNumber}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatDate(selectedReview.createdAt)}
                  </p>
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-lg bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Full Review
                </p>
                <p className="mt-3 max-h-56 max-w-full overflow-y-auto whitespace-pre-wrap break-all text-sm leading-6 [overflow-wrap:anywhere]">
                  {selectedReview.comment || "No written comment"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {selectedReview && selectedReview.status !== "approved" ? (
              <Button
                onClick={() => {
                  handleSetStatus(selectedReview.id, "approved");
                  setSelectedReview(null);
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve
              </Button>
            ) : (
              <span />
            )}
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
