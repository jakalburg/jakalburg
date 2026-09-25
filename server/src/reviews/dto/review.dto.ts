import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReviewStatus } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/pagination';

/** Longest comment we accept. Generous enough for a real write-up, short
 *  enough that the product page stays readable and the column stays sane. */
export const REVIEW_COMMENT_MAX = 1000;

export class CreateReviewDto {
  @ApiProperty({
    example: 'JB-284917',
    description:
      "Order NUMBER (the public id shown to the customer), not the row id. " +
      'The order must belong to the caller, be delivered, and contain the product.',
  })
  @IsString()
  orderNumber: string;

  @ApiProperty({ example: 'ckv...', description: 'Product being reviewed.' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 5, description: 'Whole stars, 1–5.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Beautiful drape and the colour is exactly as shown.',
    description: `Optional free text, max ${REVIEW_COMMENT_MAX} characters.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string;
}

/** Customer edit. Only allowed while the review is still `pending` — once an
 *  admin has approved it, the published text is frozen. */
export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Updated after a few more wears.' })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string;
}

/** Admin moderation. `rejected` rows are kept (auditable) rather than deleted. */
export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.approved })
  @IsEnum(ReviewStatus)
  status: ReviewStatus;
}

/** Longest display name we accept for an admin-authored review. */
export const REVIEW_AUTHOR_MAX = 80;

/**
 * Admin-authored review, added from the dashboard to seed a product page.
 *
 * No order backs it. The author is either free text (`authorName`) or a real
 * customer (`userId`) — at least one is required, and `authorName` wins for
 * display when both are given.
 */
export class AdminCreateReviewDto {
  @ApiProperty({ example: 'ckv...' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 5, description: 'Whole stars, 1–5.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: `Max ${REVIEW_COMMENT_MAX} characters.` })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string;

  @ApiPropertyOptional({
    example: 'Ananya R.',
    description:
      'Display name shown on the storefront. Required unless `userId` is set; ' +
      'overrides the linked customer\'s profile name when both are present.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_AUTHOR_MAX)
  authorName?: string;

  @ApiPropertyOptional({ description: 'Optional avatar URL for the author.' })
  @IsOptional()
  @IsString()
  authorImage?: string;

  @ApiPropertyOptional({
    example: 'ckv...',
    description: 'Attribute the review to a real customer. Optional.',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T10:00:00.000Z',
    description:
      'Backdate the review. Defaults to now — useful so a batch of seeded ' +
      'reviews does not all share one timestamp.',
  })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({
    enum: ReviewStatus,
    default: ReviewStatus.approved,
    description:
      'Defaults to `approved` — the admin is the moderator, so there is no ' +
      'queue to route their own review through.',
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

/**
 * Add the SAME review to many products at once, from the reviews dashboard.
 *
 * Target either an explicit set of `productIds` or, with `all: true`, the whole
 * catalogue. Everything else mirrors {@link AdminCreateReviewDto} — one author
 * (name or linked customer) is required, and it defaults to `approved`.
 */
export class AdminBulkCreateReviewDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Products to add the review to. Required unless `all` is true; ignored when it is.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    default: false,
    description: 'Apply to every product in the catalogue. Overrides `productIds`.',
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiProperty({ example: 5, description: 'Whole stars, 1–5.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: `Max ${REVIEW_COMMENT_MAX} characters.` })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_COMMENT_MAX)
  comment?: string;

  @ApiPropertyOptional({
    example: 'Ananya R.',
    description: 'Display name. Required unless `userId` is set.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(REVIEW_AUTHOR_MAX)
  authorName?: string;

  @ApiPropertyOptional({ description: 'Optional avatar URL for the author.' })
  @IsOptional()
  @IsString()
  authorImage?: string;

  @ApiPropertyOptional({ description: 'Attribute the reviews to a real customer.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T10:00:00.000Z',
    description: 'Backdate the reviews. Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @ApiPropertyOptional({ enum: ReviewStatus, default: ReviewStatus.approved })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

/**
 * Show or hide a set of products' reviews on the storefront. `hidden: true`
 * pulls the whole reviews section + star rating for the target products;
 * `false` puts them back. The reviews themselves are never touched.
 */
export class SetReviewDisplayDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Products to toggle. Required unless `all` is true.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    default: false,
    description: 'Apply to every product in the catalogue. Overrides `productIds`.',
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiProperty({
    example: true,
    description: 'true = hide reviews for these products; false = show them.',
  })
  @IsBoolean()
  hidden: boolean;
}

/** The reviewer as shown on the storefront — first name + last initial only.
 *  The admin list gets the full user via `AdminReviewResponseDto`. */
export class ReviewAuthorDto {
  @ApiProperty({ example: 'Ananya R.' })
  name: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...' })
  image?: string;
}

export class ReviewResponseDto {
  @ApiProperty({ example: 'ckv...' })
  id: string;

  @ApiProperty({ example: 'ckv...' })
  productId: string;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Beautiful drape.' })
  comment?: string;

  @ApiProperty({ enum: ReviewStatus })
  status: ReviewStatus;

  @ApiProperty({ type: ReviewAuthorDto })
  author: ReviewAuthorDto;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  createdAt: string;
}

/** A review as it appears in the caller's own list — includes the order it came
 *  from so the order detail page can match it to the right line item. */
export class MyReviewResponseDto extends ReviewResponseDto {
  @ApiProperty({ example: 'JB-284917' })
  orderNumber: string;
}

/** Aggregate shown above a product's review list. */
export class ProductReviewSummaryDto {
  @ApiProperty({
    example: false,
    description:
      'When true, an admin has hidden reviews for this product — the storefront ' +
      'renders nothing and the other fields are zeroed/empty.',
  })
  hidden: boolean;

  @ApiProperty({ example: 4.6, description: 'Mean of approved ratings, 1 dp.' })
  average: number;

  @ApiProperty({ example: 23, description: 'Number of approved reviews.' })
  count: number;

  @ApiProperty({
    example: { '1': 0, '2': 1, '3': 2, '4': 6, '5': 14 },
    description: 'Approved review count per star value.',
  })
  distribution: Record<string, number>;

  @ApiProperty({
    type: [ReviewResponseDto],
    description:
      'One page of approved reviews (newest first). `count` is the full total, ' +
      'not this page\'s length — the aggregates are computed in SQL across all ' +
      'approved rows, so they stay correct however few reviews are loaded.',
  })
  reviews: ReviewResponseDto[];

  @ApiProperty({ example: 1, description: '1-based page of `reviews`.' })
  page: number;

  @ApiProperty({ example: 10, description: 'Reviews requested per page.' })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Whether more reviews follow.' })
  hasMore: boolean;
}

/** Paginated envelope for the caller's own reviews. */
export class MyReviewListResponseDto extends PaginatedResponseDto<MyReviewResponseDto> {
  @ApiProperty({ type: [MyReviewResponseDto] })
  declare data: MyReviewResponseDto[];
}

/** The admin moderation list — full reviewer + product context. */
export class AdminReviewResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ description: 'Null for a free-text admin author.' })
  userId?: string;
  @ApiProperty() productId: string;
  @ApiProperty() rating: number;
  @ApiPropertyOptional() comment?: string;
  @ApiProperty({ enum: ReviewStatus }) status: ReviewStatus;

  @ApiPropertyOptional({
    example: 'JB-284917',
    description:
      'The delivered order behind this review. Absent on admin-added reviews, ' +
      'which is what distinguishes them in the dashboard list.',
  })
  orderNumber?: string;

  @ApiProperty({
    example: 'Ananya R.',
    description: 'Resolved display name — admin override, else the profile.',
  })
  authorName: string;

  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;

  @ApiPropertyOptional({
    description:
      'The linked customer, when there is one. Absent for a free-text author.',
  })
  user?: {
    id: string;
    email: string | null;
    image: string | null;
    profiles: { firstName: string | null; lastName: string | null }[];
  };

  @ApiProperty()
  product: { id: string; name: string; slug: string; thumbnail?: string };
}

/** Paginated envelope for the admin moderation list. */
export class AdminReviewListResponseDto extends PaginatedResponseDto<AdminReviewResponseDto> {
  @ApiProperty({ type: [AdminReviewResponseDto] })
  declare data: AdminReviewResponseDto[];
}
