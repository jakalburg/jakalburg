"use client";

import { CheckCircle2, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewService, type Review } from "@/services/review.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { useState } from "react";
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

export function ReviewsTab() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const {
    data: reviews = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => reviewService(api).getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewService(api).delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      reviewService(api).update(id, { status: "active" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review approved successfully");
    },
    onError: () => {
      toast.error("Failed to approve review");
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

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await approveMutation.mutateAsync(id);
    } finally {
      setApprovingId(null);
    }
  };

  const stopActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const getCustomerName = (review: Review) => {
    const profile = review.user?.profiles?.[0];
    return (
      [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
      review.user?.email?.split("@")[0] ||
      "Unknown User"
    );
  };

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
      header: "Customer",
      cell: (review: Review) => (
        <div className="text-sm">
          <div className="font-medium">{getCustomerName(review)}</div>
          <div className="text-xs text-muted-foreground">
            {review.user?.email || "No email"}
          </div>
        </div>
      ),
    },
    {
      header: "Rating",
      className: "w-[120px]",
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
      cell: (review: Review) => (
        <Badge variant={review.status === "active" ? "default" : "secondary"}>
          {review.status === "active" ? "Approved" : "Pending"}
        </Badge>
      ),
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
      className: "w-[170px]",
      cell: (review: Review) => (
        <div className="flex items-center gap-2">
          {review.status !== "active" && (
            <Button
              variant="outline"
              size="sm"
              disabled={approvingId === review.id}
              onClick={(event) => {
                stopActionClick(event);
                handleApprove(review.id);
              }}
            >
              {approvingId === review.id ? (
                "Approving..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </>
              )}
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
                  review and recalculate the product&apos;s average rating.
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border rounded-lg overflow-x-auto">
        <DataTable
          title="All Customer Reviews"
          data={reviews}
          columns={columns}
          isLoading={isLoading}
          error={error}
          emptyMessage="No reviews have been submitted yet."
          getRowKey={(review) => review.id}
          onRowClick={setSelectedReview}
        />
      </div>

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
                  <Badge
                    className="mt-2"
                    variant={
                      selectedReview.status === "active"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedReview.status === "active"
                      ? "Approved"
                      : "Pending"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Customer
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
                    {selectedReview.user?.email || "No email"}
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

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
