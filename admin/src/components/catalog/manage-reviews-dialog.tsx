"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Settings2,
  Star,
  UserRound,
} from "lucide-react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ImageShimmer } from "@/components/ui/image-shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { productsService } from "@/services/products.service";
import { customersService, type Customer } from "@/services/customers.service";
import { reviewService, type ReviewStatus } from "@/services/review.service";
import { useInfiniteOptions } from "@/hooks/use-infinite-options";
import useAxiosAuth from "@/hooks/use-axios-auth";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

// Mirrors REVIEW_COMMENT_MAX / REVIEW_AUTHOR_MAX on the API.
const COMMENT_MAX = 1000;
const AUTHOR_MAX = 80;
// A working set to scan and tick — not the whole catalogue. "Apply to all" is the
// escape hatch when the intent is every product rather than a hand-picked few.
/** Products loaded per batch in the picker; more append as it is scrolled. */
const RESULT_LIMIT = 10;

interface PickerProduct {
  id: string;
  name: string;
  thumbnail?: string;
  reviewsHidden: boolean;
  reviewCount: number;
}

/**
 * The single "Manage reviews" entry point on the reviews page.
 *
 * Behind it: pick products (a hand-picked set, or "all products at once"), then
 * either flip whether their reviews show on the storefront, or seed the same
 * review onto every one of them. Both operate on the same selection.
 */
export function ManageReviewsButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4" />
          Manage reviews
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage reviews</DialogTitle>
          <DialogDescription>
            Choose products, then show/hide their reviews or add a review to all
            of them at once.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed so closing fully resets the picker + form. */}
        {open && <ManageReviews key="open" onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ManageReviews({ onDone }: { onDone: () => void }) {
  const api = useAxiosAuth();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  // Explicit picks. Ignored while `applyAll` is on.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // "Every product in the catalogue", including ones not in the loaded list.
  const [applyAll, setApplyAll] = useState(false);

  // Products load a page at a time and append as the list is scrolled, so
  // opening this dialog never pulls the catalogue. Search runs server-side.
  const {
    data,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: productsError,
  } = useInfiniteQuery({
    queryKey: ["products", "review-manager", debouncedQuery],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      productsService(api).getAll({
        search: debouncedQuery || undefined,
        page: pageParam,
        limit: RESULT_LIMIT,
        status: "all",
      }),
    getNextPageParam: (last: any) =>
      last?.hasMore ? (last.page ?? 1) + 1 : undefined,
  });

  const products: PickerProduct[] = useMemo(
    () =>
      (data?.pages ?? []).flatMap((page: any) =>
        (page?.data ?? []).map((p: Record<string, unknown>) => ({
          id: String(p.id),
          name: String(p.name ?? p.title ?? "Untitled"),
          thumbnail: (p.thumbnail as string) ?? undefined,
          reviewsHidden: Boolean(p.reviewsHidden),
          reviewCount: Number(p.reviewCount ?? 0),
        })),
      ),
    [data],
  );

  // Pull the next batch when the end of the list scrolls into view. The
  // hasNextPage / isFetchingNextPage guards mean rapid scrolling can't queue
  // the same page twice or request anything past the last one.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, products.length]);

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // "Select all" ticks only the products currently loaded — distinct from
  // `applyAll`, which reaches the whole catalogue without listing every id.
  const allLoadedSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const toggleAllLoaded = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of products) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  // What every action below operates on.
  const hasTarget = applyAll || selectedIds.size > 0;
  const targetLabel = applyAll
    ? "all products"
    : `${selectedIds.size} ${selectedIds.size === 1 ? "product" : "products"}`;
  const targetPayload = () =>
    applyAll
      ? { all: true as const }
      : { productIds: Array.from(selectedIds) };

  const invalidate = () => {
    // Both lists move: the moderation table and the catalogue's rating column.
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  // ---- Display (show / hide) ----
  const displayMutation = useMutation({
    mutationFn: (hidden: boolean) =>
      reviewService(api).setDisplay({ ...targetPayload(), hidden }),
    onSuccess: (res, hidden) => {
      invalidate();
      toast.success(
        `${hidden ? "Hid" : "Restored"} reviews for ${res.updated} ${
          res.updated === 1 ? "product" : "products"
        }.`,
      );
    },
    onError: () => toast.error("Couldn't update review visibility."),
  });

  // ---- Bulk add ----
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  // The author field is a plain text input. As the admin types, matching
  // customers surface inline as suggestions — picking one attributes the review
  // to that customer (`customerId`). Typing a name that matches nobody is fine:
  // the review is added under that free-text `authorName`, so an author who
  // isn't a registered customer works too.
  const [authorName, setAuthorName] = useState("");
  const [customerId, setCustomerId] = useState("");
  // Held alongside the id so the linked-customer note can show a name without
  // re-fetching.
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [status, setStatus] = useState<ReviewStatus>("approved");

  // ---- Author typeahead (inline suggestions, no separate search box) ----
  const [authorOpen, setAuthorOpen] = useState(false);
  const {
    options: userOptions,
    setSearch: setUserSearch,
    isLoading: usersLoading,
    isLoadingMore: usersLoadingMore,
    hasMore: usersHasMore,
    sentinelRef: usersSentinelRef,
  } = useInfiniteOptions<Customer>({
    queryKey: ["customers", "bulk-review-author-typeahead"],
    fetchPage: ({ page, limit, search }) =>
      customersService(api).getAll({ page, limit, search, searchBy: "name" }),
    // Search only while the field is focused and has something to match on.
    enabled: authorOpen && authorName.trim().length > 0,
  });

  const pickCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setSelectedCustomer(c);
    const name = (c.name || "").slice(0, AUTHOR_MAX);
    setAuthorName(name);
    setUserSearch(name);
    setAuthorOpen(false);
  };

  const remaining = COMMENT_MAX - comment.length;
  const shownRating = hovered || rating;

  const bulkMutation = useMutation({
    mutationFn: () =>
      reviewService(api).bulkCreate({
        ...targetPayload(),
        rating,
        comment,
        authorName,
        userId: customerId || undefined,
        status,
      }),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        `Added a review to ${res.created} ${
          res.created === 1 ? "product" : "products"
        }.`,
      );
      onDone();
    },
    onError: (error: unknown) => {
      const message = (
        error as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      toast.error(
        (Array.isArray(message) ? message[0] : message) ||
          "Failed to add the reviews.",
      );
    },
  });

  // A picked customer OR a typed name is enough — the review can be authored by
  // someone who isn't a registered customer.
  const hasAuthor = Boolean(customerId) || authorName.trim().length > 0;
  const canAdd = hasTarget && rating > 0 && hasAuthor && remaining >= 0;
  const addBlockedReason = !hasTarget
    ? "Select products, or turn on “All products”."
    : !rating
      ? "Pick a rating."
      : !hasAuthor
        ? "Add an author name."
        : remaining < 0
          ? `Review is ${Math.abs(remaining)} characters over the limit.`
          : "";

  return (
    <div className="space-y-4">
      {/* -------- Product selection (shared by both tabs) -------- */}
      <div className="space-y-3 rounded-lg border p-3">
        <label className="flex items-center gap-2 rounded-md bg-muted/40 p-2">
          <Checkbox
            checked={applyAll}
            onCheckedChange={(v) => setApplyAll(v === true)}
          />
          <span className="text-sm font-medium">
            Apply to all products in the catalogue
          </span>
        </label>

        <div
          className={cn(
            "space-y-3 transition-opacity",
            applyAll && "pointer-events-none opacity-50",
          )}
          aria-hidden={applyAll}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products by name…"
              className="pl-9"
              disabled={applyAll}
            />
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={allLoadedSelected}
                onCheckedChange={(v) => toggleAllLoaded(v === true)}
                disabled={applyAll || products.length === 0}
              />
              Select all shown
            </label>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="max-h-[240px] space-y-1 overflow-y-auto">
            {isFetching && !products.length ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))
            ) : !products.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {debouncedQuery
                  ? `No products match "${debouncedQuery}".`
                  : "No products found."}
              </p>
            ) : (
              products.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
                >
                  <Checkbox
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={(v) => toggleOne(product.id, v === true)}
                    disabled={applyAll}
                  />
                  <ImageShimmer
                    src={product.thumbnail}
                    alt={product.name}
                    wrapperClassName="w-10 h-10 rounded-md border border-input flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {product.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {product.reviewCount}{" "}
                    {product.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                  {product.reviewsHidden && (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <EyeOff className="h-3 w-3" />
                      Hidden
                    </Badge>
                  )}
                </label>
              ))
            )}

            {/* Loads the next batch on scroll. The options above stay mounted
                — appending must never blank what's already selected/visible. */}
            {hasNextPage && products.length > 0 && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading more…
                  </>
                ) : productsError ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void fetchNextPage()}
                  >
                    Failed to load more — Retry
                  </Button>
                ) : (
                  "Scroll for more"
                )}
              </div>
            )}
          </div>
        </div>

        <p className="px-1 text-xs text-muted-foreground">
          Target: <span className="font-medium text-foreground">{targetLabel}</span>
        </p>
      </div>

      {/* -------- Actions -------- */}
      <Tabs defaultValue="display">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="display">Show / hide reviews</TabsTrigger>
          <TabsTrigger value="add">Add a review</TabsTrigger>
        </TabsList>

        {/* --- Show / hide --- */}
        <TabsContent value="display" className="space-y-4 pt-4">
          <p className="text-sm text-muted-foreground">
            Hiding pulls the whole reviews section and the star rating for the
            selected products off the storefront. The reviews are kept — showing
            them again brings everything back.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!hasTarget || displayMutation.isPending}
              onClick={() => displayMutation.mutate(true)}
            >
              {displayMutation.isPending && displayMutation.variables === true ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              Hide reviews for {targetLabel}
            </Button>
            <Button
              variant="outline"
              disabled={!hasTarget || displayMutation.isPending}
              onClick={() => displayMutation.mutate(false)}
            >
              {displayMutation.isPending && displayMutation.variables === false ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Show reviews for {targetLabel}
            </Button>
          </div>
          {!hasTarget && (
            <p className="text-xs text-muted-foreground">
              Select products above, or turn on &ldquo;All products&rdquo;.
            </p>
          )}
        </TabsContent>

        {/* --- Bulk add --- */}
        <TabsContent value="add" className="space-y-5 pt-4">
          <p className="text-sm text-muted-foreground">
            Adds the same review to {targetLabel}. Use it to seed pages that have
            no organic reviews yet.
          </p>

          {/* Rating */}
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
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
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

          {/* Comment */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <Label htmlFor="bulk-review-comment">Review</Label>
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
              id="bulk-review-comment"
              rows={4}
              value={comment}
              maxLength={COMMENT_MAX + 200}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What would a happy customer say about these pieces?"
              className="resize-none"
            />
          </div>

          {/* Author + status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="bulk-review-author" className="mb-2 block">
                Author <span className="text-destructive">*</span>
                {customerId && selectedCustomer && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    · linked to {selectedCustomer.name || selectedCustomer.email}
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="bulk-review-author"
                  value={authorName}
                  maxLength={AUTHOR_MAX}
                  autoComplete="off"
                  placeholder="Type an author name…"
                  onFocus={() => setAuthorOpen(true)}
                  // Delay so a click on a suggestion lands before the list closes.
                  onBlur={() =>
                    window.setTimeout(() => setAuthorOpen(false), 120)
                  }
                  onChange={(e) => {
                    const v = e.target.value.slice(0, AUTHOR_MAX);
                    setAuthorName(v);
                    setUserSearch(v);
                    setAuthorOpen(true);
                    // Editing the text drops any prior customer attribution — it's
                    // a free-text author again until another suggestion is picked.
                    if (customerId) {
                      setCustomerId("");
                      setSelectedCustomer(null);
                    }
                  }}
                />

                {authorOpen && authorName.trim().length > 0 && (
                  <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="max-h-56 overflow-y-auto py-1">
                      {usersLoading && userOptions.length === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Searching customers…
                        </div>
                      ) : userOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No customer matches “{authorName.trim()}”. It&apos;ll be
                          added under this name.
                        </div>
                      ) : (
                        userOptions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            // mousedown fires before the input's blur, so the pick
                            // isn't lost to the list closing first.
                            onMouseDown={(e) => {
                              e.preventDefault();
                              pickCustomer(c);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                          >
                            <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">
                              {c.name || c.email}
                            </span>
                            {customerId === c.id && (
                              <Check className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                        ))
                      )}

                      {usersHasMore && userOptions.length > 0 && (
                        <div
                          ref={usersSentinelRef}
                          className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
                        >
                          {usersLoadingMore ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading more…
                            </>
                          ) : (
                            "Scroll for more"
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Type any name. Matching customers appear as you type — pick one to
                attribute the review, or keep the name for a non-customer author.
              </p>
            </div>
            <div>
              <Label htmlFor="bulk-review-status" className="mb-2 block">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ReviewStatus)}
              >
                <SelectTrigger id="bulk-review-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved (live)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Approved counts toward each average.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {addBlockedReason}
            </p>
            <Button
              onClick={() => bulkMutation.mutate()}
              disabled={!canAdd || bulkMutation.isPending}
            >
              {bulkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                `Add review to ${targetLabel}`
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
