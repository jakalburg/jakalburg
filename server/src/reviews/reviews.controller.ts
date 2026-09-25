import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ReviewStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { UserWithRelations } from '../types/database.types';
import { ReviewsService } from './reviews.service';
import {
  AdminBulkCreateReviewDto,
  AdminCreateReviewDto,
  AdminReviewListResponseDto,
  AdminReviewResponseDto,
  CreateReviewDto,
  MyReviewListResponseDto,
  MyReviewResponseDto,
  ProductReviewSummaryDto,
  SetReviewDisplayDto,
  UpdateReviewDto,
  UpdateReviewStatusDto,
} from './dto/review.dto';
import { PaginationQueryDto } from '../common/pagination';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ===========================================================================
  // Admin — declared FIRST so `/reviews/admin/...` is matched before the
  // customer routes' `:id` parameter would swallow "admin".
  // ===========================================================================

  @Get('admin/all')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: list reviews (any status, paginated)',
    description: 'Defaults to page 1 × 10 reviews; `limit` is capped at 100.',
  })
  @ApiQuery({
    name: 'status',
    enum: ReviewStatus,
    required: false,
    description: 'Filter to one status. Omit for everything.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Free text over comment, author name, product title, customer.',
  })
  @ApiOkResponse({ type: AdminReviewListResponseDto })
  findAllForAdmin(
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: ReviewStatus,
    @Query('search') search?: string,
  ): Promise<AdminReviewListResponseDto> {
    return this.reviewsService.findAllForAdmin({
      ...pagination,
      status: status && status in ReviewStatus ? status : undefined,
      search,
    });
  }

  @Post('admin')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: add a review to a product',
    description:
      'Seeds a review with no order behind it. The author is either a free-text ' +
      'display name or a linked customer (at least one is required). Defaults ' +
      'to `approved`, so it publishes and counts toward the average right away.',
  })
  @ApiCreatedResponse({ type: AdminReviewResponseDto })
  @ApiBadRequestResponse({ description: 'No author given, or invalid rating.' })
  @ApiNotFoundResponse({ description: 'No product (or customer) with that id.' })
  createAsAdmin(
    @Body() dto: AdminCreateReviewDto,
  ): Promise<AdminReviewResponseDto> {
    return this.reviewsService.createAsAdmin(dto);
  }

  @Post('admin/bulk')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: add the same review to many products',
    description:
      'Seeds one review onto every target product — an explicit `productIds` ' +
      'set, or the whole catalogue with `all: true`. Same author rule and ' +
      '`approved` default as the single add.',
  })
  @ApiCreatedResponse({
    description: 'How many reviews were created.',
    schema: { example: { created: 12 } },
  })
  @ApiBadRequestResponse({ description: 'No author given, or no products selected.' })
  @ApiNotFoundResponse({ description: 'A product (or the customer) does not exist.' })
  createManyAsAdmin(
    @Body() dto: AdminBulkCreateReviewDto,
  ): Promise<{ created: number }> {
    return this.reviewsService.createManyAsAdmin(dto);
  }

  // Declared BEFORE `admin/:id` so "display" isn't captured as an id param.
  @Patch('admin/display')
  @AdminOnly()
  @ApiOperation({
    summary: "Admin: show or hide products' reviews on the storefront",
    description:
      'Flips a per-product visibility flag for an explicit `productIds` set or ' +
      'the whole catalogue (`all: true`). Hiding pulls the reviews section and ' +
      'the star rating; the reviews themselves are kept.',
  })
  @ApiOkResponse({
    description: 'How many products were updated.',
    schema: { example: { updated: 12 } },
  })
  @ApiBadRequestResponse({ description: 'No products selected.' })
  setReviewDisplay(
    @Body() dto: SetReviewDisplayDto,
  ): Promise<{ updated: number }> {
    return this.reviewsService.setReviewDisplay(dto);
  }

  @Patch('admin/:id')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: approve or reject a review',
    description:
      "Recomputes the product's average rating and review count either way.",
  })
  @ApiOkResponse({ type: AdminReviewResponseDto })
  @ApiNotFoundResponse({ description: 'No review with that id.' })
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
  ): Promise<AdminReviewResponseDto> {
    return this.reviewsService.setStatus(id, dto.status);
  }

  @Delete('admin/:id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: permanently delete a review' })
  @ApiOkResponse({ description: 'Deleted.' })
  @ApiNotFoundResponse({ description: 'No review with that id.' })
  removeAsAdmin(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.reviewsService.removeAsAdmin(id);
  }

  // ===========================================================================
  // Storefront (public) — approved reviews only.
  // ===========================================================================

  @Get('product/:slug')
  @ApiOperation({
    summary: 'Approved reviews + rating summary for a product',
    description:
      'Public. Pending and rejected reviews are never returned here. The ' +
      'review list is paginated (page 1 × 10 by default); `average`, `count` ' +
      'and `distribution` always cover every approved review.',
  })
  @ApiOkResponse({ type: ProductReviewSummaryDto })
  @ApiNotFoundResponse({ description: 'No product with that slug.' })
  findForProduct(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ProductReviewSummaryDto> {
    return this.reviewsService.findForProduct(slug, query);
  }

  // ===========================================================================
  // Customer — write + manage your own reviews.
  // ===========================================================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: "The current user's own reviews, in any status",
    description:
      'Drives the per-item review state on the order detail page, which passes ' +
      '`orderNumber` to fetch just that order\'s reviews. Paginated otherwise.',
  })
  @ApiQuery({
    name: 'orderNumber',
    required: false,
    description: 'Restrict to the reviews written from one order.',
  })
  @ApiOkResponse({ type: MyReviewListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  findMine(
    @Req() req: Request,
    @Query() pagination: PaginationQueryDto,
    @Query('orderNumber') orderNumber?: string,
  ): Promise<MyReviewListResponseDto> {
    const user = req.user as UserWithRelations;
    return this.reviewsService.findMine(user.id, { ...pagination, orderNumber });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Write a review for a product you bought',
    description:
      'The order must belong to you, be delivered, and contain the product. ' +
      'The review is created as `pending` and appears on the storefront only ' +
      'once an admin approves it.',
  })
  @ApiCreatedResponse({ type: MyReviewResponseDto })
  @ApiBadRequestResponse({
    description: 'Order not delivered yet, or the product is not in it.',
  })
  @ApiConflictResponse({
    description: 'You have already reviewed this product from this order.',
  })
  @ApiNotFoundResponse({ description: 'No such order for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  create(
    @Req() req: Request,
    @Body() dto: CreateReviewDto,
  ): Promise<MyReviewResponseDto> {
    const user = req.user as UserWithRelations;
    return this.reviewsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Edit your own review',
    description: 'Allowed only while the review is still awaiting approval.',
  })
  @ApiOkResponse({ type: MyReviewResponseDto })
  @ApiForbiddenResponse({ description: 'The review is no longer pending.' })
  @ApiNotFoundResponse({ description: 'No such review for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<MyReviewResponseDto> {
    const user = req.user as UserWithRelations;
    return this.reviewsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({
    summary: 'Withdraw your own review',
    description: 'Allowed only while the review is still awaiting approval.',
  })
  @ApiOkResponse({ description: 'Withdrawn.' })
  @ApiForbiddenResponse({ description: 'The review is no longer pending.' })
  @ApiNotFoundResponse({ description: 'No such review for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    const user = req.user as UserWithRelations;
    return this.reviewsService.remove(user.id, id);
  }
}
