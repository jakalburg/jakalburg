import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Textarea } from "@/components/ui/textarea";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { StarRatingInput } from "./StarRating";
import {
  REVIEW_COMMENT_MAX,
  useCreateReview,
  useUpdateReview,
} from "@/hooks/useReviews";
import { ApiError } from "@/lib/api-client";
import type { CartItem, MyReview } from "@/types";
import { cn } from "@/lib/utils";

// Wording for the star the shopper has landed on — a small bit of feedback so
// the picker doesn't feel inert before they start typing.
const RATING_LABELS: Record<number, string> = {
  1: "Not for me",
  2: "Below expectations",
  3: "It's fine",
  4: "Really good",
  5: "Love it",
};

/**
 * Write or edit a review for one order line item.
 *
 * Doubles as the edit form: pass the caller's `existing` review and the dialog
 * pre-fills, switches its copy, and PATCHes instead of POSTing. Editing is only
 * offered while a review is pending — the server enforces that too (403).
 */
export function ReviewDialog({
  open,
  onOpenChange,
  item,
  orderNumber,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CartItem;
  orderNumber: string;
  existing?: MyReview;
}) {
  // The form lives in a child so that Radix unmounting the content on close is
  // what resets it — reopening after a cancel can't resurrect half-typed text,
  // and there's no effect syncing state back to the `open` prop.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ReviewForm
          item={item}
          orderNumber={orderNumber}
          existing={existing}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function ReviewForm({
  item,
  orderNumber,
  existing,
  onDone,
}: {
  item: CartItem;
  orderNumber: string;
  existing?: MyReview;
  onDone: () => void;
}) {
  const isEdit = Boolean(existing);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");

  const create = useCreateReview();
  const update = useUpdateReview();
  const pending = create.isPending || update.isPending;

  const remaining = REVIEW_COMMENT_MAX - comment.length;
  const overLimit = remaining < 0;

  const submit = async () => {
    if (!rating) {
      toast.error("Please pick a star rating");
      return;
    }
    if (overLimit) return;

    const body = { rating, comment: comment.trim() || undefined };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: existing!.id, ...body });
        toast.success("Review updated — still awaiting approval");
      } else {
        await create.mutateAsync({ orderNumber, productId: item.productId, ...body });
        toast.success("Thanks! Your review is with our team for approval.");
      }
      onDone();
    } catch (err) {
      // The API returns a human-readable reason (not delivered yet, already
      // reviewed, product not in this order) — show it rather than a generic.
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't save your review.",
      );
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit your review" : "Write a review"}</DialogTitle>
        <DialogDescription>
          Reviews are checked by our team before they appear on the product page.
        </DialogDescription>
      </DialogHeader>

      {/* The piece being reviewed, so there's no doubt which line item this is. */}
      <div className="flex gap-4 border-y py-4">
        <ImageShimmer
          src={item.image}
          alt=""
          aria-hidden="true"
          wrapperClassName="h-20 w-16 shrink-0"
          className="object-cover"
        />
        <div className="min-w-0 text-sm">
          <p className="font-medium">{item.title}</p>
          <p className="mt-0.5 text-xs text-mute-text">
            {item.color} · {item.size}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="eyebrow mb-2 text-mute-text">Your rating</p>
          <div className="flex items-center gap-3">
            <StarRatingInput value={rating} onChange={setRating} disabled={pending} />
            <span className="text-sm text-mute-text">
              {RATING_LABELS[rating] ?? "Tap a star"}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="review-comment" className="eyebrow text-mute-text">
              Your review <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <span
              className={cn(
                "text-xs tabular-nums",
                overLimit ? "text-destructive" : "text-mute-text",
              )}
            >
              {remaining}
            </span>
          </div>
          <Textarea
            id="review-comment"
            rows={5}
            value={comment}
            disabled={pending}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How does it fit? How's the fabric? Would you buy it again?"
            className="resize-none"
            aria-describedby="review-comment-limit"
          />
          <p id="review-comment-limit" className="mt-1.5 text-xs text-mute-text">
            Up to {REVIEW_COMMENT_MAX.toLocaleString("en-IN")} characters.
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending || !rating || overLimit}>
          {/* The site's Lottie loader rather than a "Saving…" string — the label
              width stays put, so the footer doesn't jump on submit. */}
          {pending ? (
            <Loader size={16} />
          ) : isEdit ? (
            "Save changes"
          ) : (
            "Submit for approval"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
