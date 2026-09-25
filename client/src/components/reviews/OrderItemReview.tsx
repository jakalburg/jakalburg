import { useState } from "react";
import { toast } from "sonner";
import { PencilLine, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
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
import { StarRating } from "./StarRating";
import { ReviewDialog } from "./ReviewDialog";
import { useDeleteReview } from "@/hooks/useReviews";
import { ApiError } from "@/lib/api-client";
import type { CartItem, MyReview, MockOrder } from "@/types";

// ---------------------------------------------------------------------------
// The review control that sits beside each line item on the order detail page.
//
// It renders one of four states:
//   • no review yet + order delivered  → "Write a review"
//   • no review yet + not delivered    → a muted note explaining when they can
//   • pending                          → their stars + edit / withdraw
//   • approved / rejected              → their stars + the outcome
// ---------------------------------------------------------------------------

export function OrderItemReview({
  item,
  orderNumber,
  orderStatus,
  review,
}: {
  item: CartItem;
  orderNumber: string;
  orderStatus: MockOrder["status"];
  review?: MyReview;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const remove = useDeleteReview();

  // Mirrors REVIEWABLE_ORDER_STATUSES on the server. Kept as a list so adding
  // another eligible status stays a one-line change on both sides.
  const canReview = orderStatus === "delivered";

  const withdraw = async () => {
    try {
      await remove.mutateAsync(review!.id);
      toast.success("Review withdrawn");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't withdraw the review.",
      );
    }
  };

  // --- Nothing written yet -------------------------------------------------
  if (!review) {
    if (!canReview) {
      return (
        <p className="mt-2 text-xs text-mute-text">
          You can review this piece once it&apos;s delivered.
        </p>
      );
    }
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setDialogOpen(true)}
        >
          <Star className="size-3.5" aria-hidden="true" />
          Write a review
        </Button>
        <ReviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={item}
          orderNumber={orderNumber}
        />
      </>
    );
  }

  // --- Already written -----------------------------------------------------
  return (
    <div className="mt-3 border-l-2 pl-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating value={review.rating} />
        <ReviewStatusNote status={review.status} />
      </div>

      {review.comment && (
        <p className="mt-1.5 line-clamp-2 text-xs text-mute-text">{review.comment}</p>
      )}

      {/* Edits and withdrawals are only possible before an admin has ruled on
          it — once published (or rejected) the record is the admin's to manage. */}
      {review.status === "pending" && (
        <div className="mt-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            <PencilLine className="size-3" aria-hidden="true" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                disabled={remove.isPending}
              >
                {remove.isPending ? <Loader size={14} /> : "Withdraw"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw this review?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your rating and comment for {item.title} will be deleted. You can
                  write a new one for this order afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction
                  onClick={withdraw}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Withdraw
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ReviewDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            item={item}
            orderNumber={orderNumber}
            existing={review}
          />
        </div>
      )}
    </div>
  );
}

/** The moderation outcome, in words rather than a coloured pill — the account
 *  area is otherwise plain text, and "Awaiting approval" says more than a dot. */
function ReviewStatusNote({ status }: { status: MyReview["status"] }) {
  if (status === "approved") {
    return <span className="text-xs text-mute-text">Published</span>;
  }
  if (status === "rejected") {
    return (
      <span className="text-xs text-destructive">
        Not approved — it didn&apos;t meet our review guidelines
      </span>
    );
  }
  return <span className="text-xs text-mute-text">Awaiting approval</span>;
}
