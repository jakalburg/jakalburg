import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { CouponDiscountType } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/pagination';

export class CreateCouponDto {
  @ApiProperty({ example: 'SAVE20', description: 'Coupon code (stored UPPERCASE).' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiPropertyOptional({ example: '20% off everything' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: CouponDiscountType, example: CouponDiscountType.percentage })
  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @ApiProperty({
    example: 20,
    description: 'Percent (0–100) when percentage; whole INR when fixed.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  discountAmount: number;

  @ApiPropertyOptional({ example: 500, description: 'Minimum cart subtotal (INR).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minimumAmount?: number;

  @ApiPropertyOptional({
    example: 'all',
    description: 'Informational label only; NOT enforced at checkout.',
  })
  @IsOptional()
  @IsString()
  productType?: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z', description: 'Expiry; omit for none.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Total redemptions allowed; omit for unlimited.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsage?: number;

  @ApiPropertyOptional({ example: 'https://…/logo.png' })
  @IsOptional()
  @IsString()
  logo?: string;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SAVE20' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 2580, description: 'Current cart subtotal (INR) to price the discount against.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subtotal: number;
}

/** A coupon as returned to the admin / storefront. */
export class CouponResponseDto {
  @ApiProperty({ example: 'clx…' })
  id: string;

  @ApiProperty({ example: 'SAVE20' })
  code: string;

  @ApiPropertyOptional({ example: '20% off everything' })
  title?: string | null;

  @ApiProperty({ enum: CouponDiscountType })
  discountType: CouponDiscountType;

  @ApiProperty({ example: 20 })
  discountAmount: number;

  @ApiProperty({ example: 500 })
  minimumAmount: number;

  @ApiProperty({ example: 'all', description: 'Informational label only.' })
  productType: string;

  @ApiPropertyOptional({ example: '2026-12-31T00:00:00.000Z' })
  endDate?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 100 })
  maxUsage?: number | null;

  @ApiProperty({ example: 3 })
  usageCount: number;

  @ApiPropertyOptional({ example: 'https://…/logo.png' })
  logo?: string | null;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z' })
  updatedAt: string;
}

/** The result of validating a code against a subtotal. */
export class ValidateCouponResponseDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ example: 'Coupon applied.' })
  message: string;

  @ApiProperty({ example: 516, description: 'Discount in whole INR (0 when invalid).' })
  discountAmount: number;

  @ApiPropertyOptional({ example: 'SAVE20' })
  couponCode?: string;

  @ApiPropertyOptional({ enum: CouponDiscountType })
  discountType?: CouponDiscountType;
}

/** Paginated coupon list envelope. */
export class CouponListResponseDto extends PaginatedResponseDto<CouponResponseDto> {
  @ApiProperty({ type: [CouponResponseDto] })
  declare data: CouponResponseDto[];
}

/** The customer who placed an order that redeemed a coupon. */
export class CouponUsageUserDto {
  @ApiProperty({ example: 'clx…' })
  id: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Display name (profile, else email local-part).' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;
}

/** One order that redeemed a coupon, reconstructed from Order.couponCode. */
export class CouponUsageRowDto {
  @ApiProperty({ example: 'clx…', description: 'Order id — link target for the order detail screen.' })
  orderId: string;

  @ApiProperty({ example: 'JB-284917' })
  orderNumber: string;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z', description: 'When the order was placed.' })
  createdAt: string;

  @ApiProperty({ example: 2580, description: 'Order total in whole INR.' })
  total: number;

  @ApiProperty({ example: 516, description: 'Discount applied on this order (whole INR).' })
  discount: number;

  @ApiPropertyOptional({
    type: CouponUsageUserDto,
    nullable: true,
    description: 'The customer who placed the order; null for a guest order.',
  })
  user: CouponUsageUserDto | null;
}

/** A coupon plus every order that has redeemed it (newest first). */
export class CouponUsageResponseDto {
  @ApiProperty({ type: CouponResponseDto })
  coupon: CouponResponseDto;

  @ApiProperty({ type: [CouponUsageRowDto] })
  usage: CouponUsageRowDto[];
}
