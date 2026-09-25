import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  Product,
  Profile,
  Review,
  ReviewStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminBulkCreateReviewDto,
  AdminCreateReviewDto,
  AdminReviewResponseDto,
  CreateReviewDto,
  MyReviewResponseDto,
  ProductReviewSummaryDto,
  ReviewResponseDto,
  SetReviewDisplayDto,
  UpdateReviewDto,
} from './dto/review.dto';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

/** Order statuses that entitle the buyer to review what they bought. Reviews
 *  are only credible once the piece is actually in the customer's hands. */
const REVIEWABLE_ORDER_STATUSES: OrderStatus[] = [OrderStatus.delivered];

type ReviewWithAuthor = Review & {
  // Null on an admin review with a free-text author.
  user: (User & { profiles: Profile[] }) | null;
};

type ReviewWithContext = ReviewWithAuthor & {
  order: { orderNumber: string } | null;
  product: Pick<Product, 'id' | 'title' | 'slug' | 'images'>;
};

/** An order-backed review, i.e. one written by a customer off a real purchase. */
type OrderBackedReview = ReviewWithContext & { order: { orderNumber: string } };

// The reviewer, always pulled with their newest profile so the display name
// survives a profile edit.
const INCLUDE_AUTHOR = {
  user: {
    include: { profiles: { orderBy: { createdAt: 'desc' as const }, take: 1 } },
  },
} satisfies Prisma.ReviewInclude;

const INCLUDE_CONTEXT = {
  ...INCLUDE_AUTHOR,
  order: { select: { orderNumber: true } },
  product: { select: { id: true, title: true, slug: true, images: true } },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Storefront (public) — approved reviews only, ever.
  // ---------------------------------------------------------------------------

  /** Approved reviews for a product, newest first, plus the star breakdown the
   *  product page renders above the list. */
  async findForProduct(
    slug: string,
    query: PaginationQuery = {},
  ): Promise<ProductReviewSummaryDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, reviewsHidden: true },
    });
    if (!product) throw new NotFoundException('No product with that slug.');

    // An admin has switched reviews off for this product — serve nothing, so the
    // storefront shows neither the list nor the rating even if approved rows exist.
    if (product.reviewsHidden) {
      return {
        hidden: true,
        average: 0,
        count: 0,
        distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
        reviews: [],
        page: 1,
        limit: parsePagination(query).limit,
        totalPages: 1,
        hasMore: false,
      };
    }

    const params = parsePagination(query);
    const where: Prisma.ReviewWhereInput = {
      productId: product.id,
      status: ReviewStatus.approved,
    };

    // The star breakdown is grouped in SQL rather than counted from the rows we
    // happen to have fetched — otherwise page 2 would report a different
    // average than page 1.
    // Promise.all rather than $transaction: Prisma's groupBy return type does
    // not survive the $transaction tuple inference, and two concurrent reads
    // need no atomicity here.
    const [grouped, reviews] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
      this.prisma.review.findMany({
        where,
        include: INCLUDE_AUTHOR,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    const distribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };
    let count = 0;
    let ratingSum = 0;
    for (const row of grouped) {
      const n = row._count.rating;
      distribution[String(row.rating)] = n;
      count += n;
      ratingSum += row.rating * n;
    }
    const average = count ? Math.round((ratingSum / count) * 10) / 10 : 0;

    return {
      hidden: false,
      average,
      count,
      distribution,
      reviews: reviews.map((r) => this.toResponse(r)),
      page: params.page,
      limit: params.limit,
      totalPages: Math.max(1, Math.ceil(count / params.take)),
      hasMore: params.skip + reviews.length < count,
    };
  }

  // ---------------------------------------------------------------------------
  // Customer — write + manage their own reviews.
  // ---------------------------------------------------------------------------

  /**
   * Every review the caller WROTE, in any status, tagged with the order it came
   * from. The order detail page uses this to decide what each line item shows
   * (write / pending / approved / rejected).
   *
   * Scoped to order-backed rows on purpose: an admin may attribute a seeded
   * review to a real customer, and surfacing that here would tell them they
   * wrote something they didn't. Those rows have no order, so they'd have no
   * line item to attach to either.
   */
  async findMine(
    userId: string,
    query: PaginationQuery & { orderNumber?: string } = {},
  ): Promise<PaginatedResult<MyReviewResponseDto>> {
    const params = parsePagination(query);
    const where: Prisma.ReviewWhereInput = { userId, orderId: { not: null } };
    // The order detail page only cares about one order's reviews. Filtering
    // here keeps that read bounded by the order's line-item count instead of
    // the customer's whole review history.
    if (query.orderNumber) {
      where.order = { orderNumber: query.orderNumber };
    }

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: INCLUDE_CONTEXT,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(
      (reviews as OrderBackedReview[]).map((r) => ({
        ...this.toResponse(r),
        orderNumber: r.order.orderNumber,
      })),
      total,
      params,
    );
  }

  /**
   * Write a review. The caller must own the order, the order must be delivered,
   * and it must actually contain the product — all three are checked here rather
   * than trusted from the client. New reviews always start `pending`.
   */
  async create(
    userId: string,
    dto: CreateReviewDto,
  ): Promise<MyReviewResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: dto.orderNumber, userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        items: { select: { productId: true } },
      },
    });
    if (!order) throw new NotFoundException('No such order for this user.');

    if (!REVIEWABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'You can review a piece once its order has been delivered.',
      );
    }
    if (!order.items.some((i) => i.productId === dto.productId)) {
      throw new BadRequestException('That product is not part of this order.');
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          userId,
          productId: dto.productId,
          orderId: order.id,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          status: ReviewStatus.pending,
        },
        include: INCLUDE_CONTEXT,
      });
      // No rating recompute here — a pending review is invisible to the
      // storefront until an admin approves it.
      return {
        ...this.toResponse(review),
        orderNumber: (review as OrderBackedReview).order.orderNumber,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'You have already reviewed this piece from this order.',
        );
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException('No product with that id.');
      }
      throw err;
    }
  }

  /** Edit your own review — only while it is still awaiting moderation. */
  async update(
    userId: string,
    id: string,
    dto: UpdateReviewDto,
  ): Promise<MyReviewResponseDto> {
    const existing = await this.findOwn(userId, id);
    if (existing.status !== ReviewStatus.pending) {
      throw new ForbiddenException(
        'A review can only be edited while it is awaiting approval.',
      );
    }

    const review = await this.prisma.review.update({
      where: { id },
      data: {
        rating: dto.rating,
        comment:
          dto.comment === undefined ? undefined : dto.comment.trim() || null,
      },
      include: INCLUDE_CONTEXT,
    });
    return {
      ...this.toResponse(review),
      orderNumber: (review as OrderBackedReview).order.orderNumber,
    };
  }

  /** Withdraw your own review — only while it is still awaiting moderation. */
  async remove(userId: string, id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.findOwn(userId, id);
    if (existing.status !== ReviewStatus.pending) {
      throw new ForbiddenException(
        'A review can only be withdrawn while it is awaiting approval.',
      );
    }
    await this.prisma.review.delete({ where: { id } });
    return { success: true, id };
  }

  // ---------------------------------------------------------------------------
  // Admin — moderation.
  // ---------------------------------------------------------------------------

  /**
   * Add a review from the dashboard — used to seed a product page that has no
   * organic reviews yet. No order backs it, so none of the customer-side
   * eligibility checks apply; what IS enforced is that the product exists, that
   * any linked customer exists, and that the review has an author one way or
   * the other.
   *
   * Defaults to `approved`, so unless the caller says otherwise this publishes
   * immediately and is folded straight into the product's average.
   */
  async createAsAdmin(dto: AdminCreateReviewDto): Promise<AdminReviewResponseDto> {
    const authorName = dto.authorName?.trim();
    if (!authorName && !dto.userId) {
      throw new BadRequestException(
        'Give the review an author: either a display name or a customer to attribute it to.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('No product with that id.');

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('No customer with that id.');
    }

    const status = dto.status ?? ReviewStatus.approved;
    const review = await this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId: dto.userId ?? null,
        orderId: null, // nothing was bought — this is a seeded review
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        authorName: authorName || null,
        authorImage: dto.authorImage?.trim() || null,
        status,
        // Backdating is allowed so a batch of seeded reviews doesn't all land on
        // the same timestamp and read as bulk-added.
        ...(dto.createdAt ? { createdAt: new Date(dto.createdAt) } : {}),
      },
      include: INCLUDE_CONTEXT,
    });

    if (status === ReviewStatus.approved) {
      await this.recomputeProductRating(dto.productId);
    }
    return this.toAdminResponse(review as ReviewWithContext);
  }

  /**
   * Add the SAME review to many products in one go — for seeding a batch of
   * product pages from the dashboard. Targets either explicit ids or, with
   * `all`, the whole catalogue. Same author rule as {@link createAsAdmin}.
   */
  async createManyAsAdmin(
    dto: AdminBulkCreateReviewDto,
  ): Promise<{ created: number }> {
    const authorName = dto.authorName?.trim();
    if (!authorName && !dto.userId) {
      throw new BadRequestException(
        'Give the review an author: either a display name or a customer to attribute it to.',
      );
    }

    // Resolve the target product ids up front so we can report an accurate count
    // and reject unknown ids rather than silently dropping them.
    let productIds: string[];
    if (dto.all) {
      const rows = await this.prisma.product.findMany({ select: { id: true } });
      productIds = rows.map((r) => r.id);
    } else {
      const requested = [...new Set(dto.productIds ?? [])];
      if (!requested.length) {
        throw new BadRequestException(
          'Select at least one product, or set `all`.',
        );
      }
      const rows = await this.prisma.product.findMany({
        where: { id: { in: requested } },
        select: { id: true },
      });
      if (rows.length !== requested.length) {
        throw new NotFoundException('One or more products do not exist.');
      }
      productIds = rows.map((r) => r.id);
    }

    if (!productIds.length) return { created: 0 };

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('No customer with that id.');
    }

    const status = dto.status ?? ReviewStatus.approved;
    const createdAt = dto.createdAt ? new Date(dto.createdAt) : undefined;
    const comment = dto.comment?.trim() || null;

    const result = await this.prisma.review.createMany({
      data: productIds.map((productId) => ({
        productId,
        userId: dto.userId ?? null,
        orderId: null, // seeded — nothing was bought
        rating: dto.rating,
        comment,
        authorName: authorName || null,
        authorImage: dto.authorImage?.trim() || null,
        status,
        ...(createdAt ? { createdAt } : {}),
      })),
    });

    // Only approved reviews move a product's aggregates.
    if (status === ReviewStatus.approved) {
      for (const productId of productIds) {
        await this.recomputeProductRating(productId);
      }
    }
    return { created: result.count };
  }

  /**
   * Show or hide reviews for a set of products (or the whole catalogue). Flips
   * Product.reviewsHidden; the storefront reads it to drop the reviews section
   * and rating. The reviews themselves are left untouched.
   */
  async setReviewDisplay(
    dto: SetReviewDisplayDto,
  ): Promise<{ updated: number }> {
    if (!dto.all && !dto.productIds?.length) {
      throw new BadRequestException('Select at least one product, or set `all`.');
    }
    const result = await this.prisma.product.updateMany({
      where: dto.all ? {} : { id: { in: dto.productIds } },
      data: { reviewsHidden: dto.hidden },
    });
    return { updated: result.count };
  }

  /**
   * One page of reviews for the moderation list, newest first, optionally
   * filtered by status and free-text searched over the comment, the author name
   * and the product title.
   */
  async findAllForAdmin(
    query: PaginationQuery & { status?: ReviewStatus; search?: string } = {},
  ): Promise<PaginatedResult<AdminReviewResponseDto>> {
    const params = parsePagination(query);
    const where: Prisma.ReviewWhereInput = {};
    if (query.status) where.status = query.status;

    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { comment: { contains: term, mode: 'insensitive' } },
        { authorName: { contains: term, mode: 'insensitive' } },
        { product: { title: { contains: term, mode: 'insensitive' } } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        {
          user: {
            profiles: {
              some: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: INCLUDE_CONTEXT,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(
      reviews.map((r) => this.toAdminResponse(r as ReviewWithContext)),
      total,
      params,
    );
  }

  /** Approve or reject. Either way the product's aggregates are recomputed —
   *  approving adds the rating to the average, rejecting takes it back out. */
  async setStatus(
    id: string,
    status: ReviewStatus,
  ): Promise<AdminReviewResponseDto> {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!existing) throw new NotFoundException('No review with that id.');

    const review = await this.prisma.review.update({
      where: { id },
      data: { status },
      include: INCLUDE_CONTEXT,
    });
    await this.recomputeProductRating(existing.productId);
    return this.toAdminResponse(review as ReviewWithContext);
  }

  /** Hard delete from the admin, at any status. */
  async removeAsAdmin(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
    if (!existing) throw new NotFoundException('No review with that id.');

    await this.prisma.review.delete({ where: { id } });
    await this.recomputeProductRating(existing.productId);
    return { success: true, id };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Load a review and assert the caller wrote it. A review belonging to someone
   *  else reads as "not found" so ids can't be probed. */
  private async findOwn(userId: string, id: string): Promise<Review> {
    const review = await this.prisma.review.findFirst({ where: { id, userId } });
    if (!review) throw new NotFoundException('No such review for this user.');
    return review;
  }

  /**
   * Recompute Product.avgRating / Product.reviewCount from the APPROVED reviews.
   * Called after every status change and delete — a full recount rather than an
   * incremental adjustment, so the aggregates can never drift out of sync.
   */
  private async recomputeProductRating(productId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { productId, status: ReviewStatus.approved },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const count = agg._count._all;
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        reviewCount: count,
        avgRating: count ? Math.round((agg._avg.rating ?? 0) * 10) / 10 : 0,
      },
    });
  }

  /**
   * The name shown on the storefront. An admin-supplied `authorName` wins, so
   * the dashboard can publish under any display name; otherwise it's the linked
   * customer as first name + last initial ("Ananya R.") — enough to feel human
   * without publishing a full surname or an email address.
   */
  private displayName(review: ReviewWithAuthor): string {
    const override = review.authorName?.trim();
    if (override) return override;

    const user = review.user;
    const profile = user?.profiles[0];
    const first = profile?.firstName?.trim();
    const lastInitial = profile?.lastName?.trim()?.[0];
    if (first) return lastInitial ? `${first} ${lastInitial}.` : first;
    const handle = user?.email?.split('@')[0];
    return handle || 'Anonymous';
  }

  private toResponse(review: ReviewWithAuthor): ReviewResponseDto {
    return {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment ?? undefined,
      status: review.status,
      author: {
        name: this.displayName(review),
        image: review.authorImage ?? review.user?.image ?? undefined,
      },
      createdAt: review.createdAt.toISOString(),
    };
  }

  private toAdminResponse(review: ReviewWithContext): AdminReviewResponseDto {
    return {
      id: review.id,
      userId: review.userId ?? undefined,
      productId: review.productId,
      rating: review.rating,
      comment: review.comment ?? undefined,
      status: review.status,
      // Absent on admin-added reviews — that's what marks them out in the list.
      orderNumber: review.order?.orderNumber,
      authorName: this.displayName(review),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: review.user
        ? {
            id: review.user.id,
            email: review.user.email,
            image: review.user.image,
            profiles: review.user.profiles.map((p) => ({
              firstName: p.firstName,
              lastName: p.lastName,
            })),
          }
        : undefined,
      product: {
        id: review.product.id,
        name: review.product.title,
        slug: review.product.slug,
        thumbnail: review.product.images[0],
      },
    };
  }
}
