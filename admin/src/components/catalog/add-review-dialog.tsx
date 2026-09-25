"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Star, UserRound, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { customersService, type Customer } from "@/services/customers.service";
import { reviewService, type ReviewStatus } from "@/services/review.service";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { cn } from "@/lib/utils";
import { InfiniteCombobox } from "@/components/admin/infinite-combobox";

// Mirrors REVIEW_COMMENT_MAX / REVIEW_AUTHOR_MAX on the API.
const COMMENT_MAX = 1000;
const AUTHOR_MAX = 80;

/** The product a review is being written against. */
export interface ReviewTargetProduct {
  id: string;
  name: string;
  thumbnail?: string;
}

/** `new Date()` → the `YYYY-MM-DDTHH:mm` a datetime-local input expects, in the
 *  admin's own timezone (toISOString would silently shift it to UTC). */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Add a review to a product from the dashboard.
 *
 * Used to seed a product page that has no organic reviews yet, so the author is
 * free text by default — optionally attributed to a real customer. There is no
 * order behind these; the server allows that and the storefront no longer calls
 * any review "verified" as a result.
 *
 * Opened from two places: the product table's row menu, and the floating button
 * on the reviews page (which picks the product first).
 */
export function AddReviewDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ReviewTargetProduct | null;
}) {
  // The form lives in a child so that Radix unmounting the content on close is
  // what resets it — no effect syncing state back to the `open` prop. Keyed by
  // product so reopening on a different row starts clean too.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {product && (
          <AddReviewForm
            key={product.id}
            product={product}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddReviewForm({
  product,
  onDone,
}: {
  product: ReviewTargetProduct;
  onDone: () => void;
}) {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [customerId, setCustomerId] = useState("");
  // Held alongside the id so the "linked customer" row can show a name without
  // re-fetching — the picker only ever loads a page at a time.
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  // Defaults to now; the admin can backdate it.
  const [createdAt, setCreatedAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [status, setStatus] = useState<ReviewStatus>("approved");

  // Customers load 10 at a time inside the picker below, and only once it is
  // opened — this is an optional field on a form most admins submit without
  // touching it, so there is no reason to pull the customer list up front.

  const createMutation = useMutation({
    mutationFn: () =>
      reviewService(api).create({
        productId: product.id,
        rating,
        comment,
        authorName,
        userId: customerId || undefined,
        // datetime-local has no timezone; the Date constructor reads it as local
        // and toISOString normalises it for the API.
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
        status,
      }),
    onSuccess: () => {
      // Both the moderation list and the catalogue (average rating column) move.
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(
        status === "approved"
          ? "Review added and published"
          : "Review added",
      );
      onDone();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message;
      toast.error(
        (Array.isArray(message) ? message[0] : message) ||
          "Failed to add the review",
      );
    },
  });

  const remaining = COMMENT_MAX - comment.length;
  // The server requires an author one way or the other — mirror that here so the
  // admin gets the feedback before a round-trip.
  // An author is either a typed name OR a linked customer — one is enough, and
  // the form labels say so.
  const hasAuthor = Boolean(authorName.trim() || customerId);
  const canSubmit = rating > 0 && hasAuthor && remaining >= 0;

  const blockedReason = !rating
    ? "Pick a rating to continue."
    : !hasAuthor
      ? "Add an author name, or link a customer."
      : remaining < 0
        ? `Review is ${Math.abs(remaining)} characters over the limit.`
        : "";

  const shownRating = hovered || rating;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add a review</DialogTitle>
        <DialogDescription>
          Written here rather than by a customer — no order is required. It
          publishes straight away unless you set it to pending.
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <ImageShimmer
          src={product.thumbnail}
          alt={product.name}
          wrapperClassName="w-10 h-10 rounded-md border border-input flex-shrink-0"
        />
        <span className="text-sm font-medium">{product.name}</span>
      </div>

      <div className="space-y-5">
          {/* --- Rating --- */}
          <div>
            <Label className="mb-2 block">
              Rating <span className="text-destructive">*</span>
            </Label>
            <div
              className="flex items-center gap-1"
              role="radiogroup"
              aria-label="Rating"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  tabIndex={star === (rating || 1) ? 0 : -1}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setRating((r) => Math.min(5, r + 1));
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                      e.preventDefault();
                      setRating((r) => Math.max(1, r - 1));
                    }
                  }}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      star <= shownRating
                        ? "text-amber-500 fill-current"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating ? `${rating} / 5` : "Pick a rating"}
              </span>
            </div>
          </div>

          {/* --- Comment --- */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <Label htmlFor="review-comment">Review</Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  remaining < 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {remaining}
              </span>
            </div>
            <Textarea
              id="review-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What would a happy customer say about this piece?"
              className="resize-none"
            />
          </div>

          {/* --- Author ---
              One requirement, two ways to satisfy it. The asterisk sits on the
              group, NOT on the name field — marking the name required while
              labelling the picker "optional" reads as "you must type a name"
              even after a customer has been chosen. */}
          <div>
            <Label className="mb-1 block">
              Author <span className="text-destructive">*</span>
            </Label>
            <p className="mb-2 text-xs text-muted-foreground">
              Type a name or pick a customer — either one is enough.
            </p>
            <Input
              id="review-author"
              value={authorName}
              maxLength={AUTHOR_MAX}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={
                selectedCustomer
                  ? `Defaults to ${selectedCustomer.name || selectedCustomer.email}`
                  : "e.g. Ananya R."
              }
              aria-label="Author name"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selectedCustomer
                ? "Leave blank to show the linked customer's profile name."
                : "Shown on the product page."}
            </p>

            <div className="mt-3">
              <Label className="mb-2 block text-xs text-muted-foreground">
                Or link a customer
              </Label>
              {selectedCustomer ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {selectedCustomer.name || selectedCustomer.email}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {selectedCustomer.email}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    aria-label="Unlink customer"
                    onClick={() => setCustomerId("")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <InfiniteCombobox<Customer>
                  queryKey={["customers", "review-author-picker"]}
                  fetchPage={({ page, limit, search }) =>
                    customersService(api).getAll({ page, limit, search })
                  }
                  getOptionId={(c) => c.id}
                  getOptionLabel={(c) => c.name || c.email}
                  selectedId={customerId}
                  placeholder="Search customers…"
                  searchPlaceholder="Search by name or email…"
                  emptyMessage="No customers found."
                  onSelect={(c) => {
                    setCustomerId(c.id);
                    setSelectedCustomer(c);
                    // Prefill the display name from the customer, but leave it
                    // editable — the admin may want a shorter form than the
                    // full profile name.
                    if (!authorName.trim() && c.name) {
                      setAuthorName(c.name.slice(0, AUTHOR_MAX));
                    }
                  }}
                  renderOption={(c) => (
                    <>
                      <span className="min-w-0 flex-1 truncate">
                        {c.name || c.email}
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {c.email}
                      </span>
                    </>
                  )}
                />
              )}
            </div>
          </div>

          {/* --- Date + status --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="review-date" className="mb-2 block">
                Date
              </Label>
              <Input
                id="review-date"
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Backdate so seeded reviews don&apos;t share one timestamp.
              </p>
            </div>
            <div>
              <Label htmlFor="review-status" className="mb-2 block">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ReviewStatus)}
              >
                <SelectTrigger id="review-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved (live)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Approved counts toward the product&apos;s average.
              </p>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:items-center sm:justify-between">
        {/* Say what's still missing rather than leaving a silently dead button. */}
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {blockedReason}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onDone}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? "Adding…" : "Add review"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
