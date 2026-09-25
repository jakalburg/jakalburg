import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useProductReviews } from "@/hooks/useReviews";
import { formatDate } from "@/lib/format";
import type { Review } from "@/types";

/**
 * The reviews section on the product detail page.
 *
 * Approved reviews only — the API never serves anything else here. Laid out as
 * a two-column editorial block: the aggregate (average, stars, star breakdown)
 * sits in a sticky left rail, the reviews themselves read down the right.
 */
export function ProductReviews({ slug }: { slug: string }) {
  const {
    summary: data,
    reviews,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useProductReviews(slug);

  if (isLoading) {
    return (
      <section className="container-vh py-16">
        <div className="h-3 w-24 animate-pulse bg-stone" />
        <div className="mt-8 grid gap-10 md:grid-cols-[240px_1fr]">
          <div className="h-32 w-full animate-pulse bg-stone" />
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 w-full animate-pulse bg-stone" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // An admin has switched reviews off for this product — render nothing at all,
  // not even the "no reviews yet" invite. (The product page already guards on
  // this too; this is the belt-and-braces guard for any other caller.)
  if (data?.hidden) return null;

  // Nothing approved yet. Rather than hide the section entirely, invite the
  // next buyer — and say plainly that reviews come from verified orders.
  if (!reviews.length) {
    return (
      <section className="container-vh py-16">
        <h2 className="text-xl md:text-2xl">Reviews</h2>
        <p className="mt-3 max-w-md text-sm text-mute-text">
          No reviews yet — yours could be the first. You can review a piece from
          your account once your order has been delivered.
        </p>
      </section>
    );
  }

  return (
    <section className="container-vh border-t py-16">
      <h2 className="text-xl md:text-2xl">
        Reviews <span className="text-mute-text">({data!.count})</span>
      </h2>

      <div className="mt-8 grid gap-10 md:grid-cols-[240px_1fr]">
        {/* --- Aggregate rail --- */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl leading-none">{data!.average.toFixed(1)}</span>
            <span className="text-sm text-mute-text">/ 5</span>
          </div>
          <StarRating value={data!.average} size="md" className="mt-2" />
          {/* Deliberately not "verified" — the admin can add reviews from the
              dashboard that aren't tied to an order, so claiming every one is
              purchase-backed would be untrue. */}
          <p className="mt-2 text-xs text-mute-text">
            Based on {data!.count} {data!.count === 1 ? "review" : "reviews"}
          </p>

          <ul className="mt-6 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = data!.distribution[String(star)] ?? 0;
              const pct = data!.count ? (n / data!.count) * 100 : 0;
              return (
                <li key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 tabular-nums text-mute-text">{star}</span>
                  <span className="h-1 flex-1 bg-stone" aria-hidden="true">
                    <span
                      className="block h-full bg-foreground"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-6 text-right tabular-nums text-mute-text">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* --- The reviews --- */}
        <div>
          <ul className="divide-y border-y">
            {reviews.map((review) => (
              <ReviewEntry key={review.id} review={review} />
            ))}
          </ul>

          {/* Each click fetches the next batch from the API and appends it —
              already-read reviews stay on screen, including after a failure. */}
          {hasNextPage && (
            <div className="mt-6 flex flex-col items-start gap-2">
              {error && (
                <p className="text-xs text-mute-text">
                  Couldn&apos;t load more reviews.
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? "Loading…"
                  : error
                    ? "Retry"
                    : `Show more reviews (${reviews.length} of ${data!.count})`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewEntry({ review }: { review: Review }) {
  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StarRating value={review.rating} />
        <time className="text-xs text-mute-text" dateTime={review.createdAt}>
          {formatDate(review.createdAt)}
        </time>
      </div>
      <p className="mt-2 text-sm font-medium">{review.author.name}</p>
      {review.comment && (
        <p className="mt-2 max-w-prose whitespace-pre-wrap text-sm text-muted-foreground">
          {review.comment}
        </p>
      )}
    </li>
  );
}
