import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import {
  CouponListResponseDto,
  CouponResponseDto,
  CouponUsageResponseDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  ValidateCouponResponseDto,
} from './dto/coupon.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { PaginationQueryDto } from '../common/pagination';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ===========================================================================
  // Public (storefront): validate a code against a subtotal at checkout. This
  // never mutates anything — redemption is recorded only when the order is
  // actually placed (inside the order transaction).
  // ===========================================================================

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon code against a cart subtotal' })
  @ApiOkResponse({ type: ValidateCouponResponseDto })
  validate(@Body() dto: ValidateCouponDto): Promise<ValidateCouponResponseDto> {
    return this.couponsService.validate(dto.code, dto.subtotal);
  }

  // ===========================================================================
  // Admin CRUD — each route is @AdminOnly() (valid admin JWT required).
  // ===========================================================================

  @Get()
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: list coupons (paginated)',
    description: 'Defaults to page 1 × 10 coupons; `limit` is capped at 100.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Free text over coupon code and description.',
  })
  @ApiOkResponse({ type: CouponListResponseDto })
  findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('search') search?: string,
  ): Promise<CouponListResponseDto> {
    return this.couponsService.findAll({ ...pagination, search });
  }

  @Get(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: get a coupon by id' })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiNotFoundResponse({ description: 'No coupon with that id.' })
  findOne(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.findOne(id);
  }

  @Get(':id/usage')
  @AdminOnly()
  @ApiOperation({
    summary: 'Admin: list the orders that redeemed a coupon',
    description:
      'Reconstructed from Order.couponCode (there is no per-redemption table); each row carries the customer and the order it was used on.',
  })
  @ApiOkResponse({ type: CouponUsageResponseDto })
  @ApiNotFoundResponse({ description: 'No coupon with that id.' })
  findUsage(@Param('id') id: string): Promise<CouponUsageResponseDto> {
    return this.couponsService.findUsage(id);
  }

  @Post()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: create a coupon' })
  @ApiCreatedResponse({ type: CouponResponseDto })
  @ApiConflictResponse({ description: 'A coupon with that code already exists.' })
  create(@Body() dto: CreateCouponDto): Promise<CouponResponseDto> {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update a coupon' })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiNotFoundResponse({ description: 'No coupon with that id.' })
  @ApiConflictResponse({ description: 'A coupon with that code already exists.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: delete a coupon' })
  @ApiOkResponse({ description: 'Deleted.' })
  @ApiNotFoundResponse({ description: 'No coupon with that id.' })
  remove(@Param('id') id: string): Promise<{ success: boolean; id: string }> {
    return this.couponsService.remove(id);
  }
}
