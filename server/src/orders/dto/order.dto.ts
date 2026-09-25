import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginatedResponseDto } from '../../common/pagination';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';
import { AddressDto } from '../../common/dto/address.dto';

/** A line the client is ordering. Identity + quantity only — the server snapshots
 *  live product data (title/image/price/slug) and computes the price itself. */
export class OrderItemInputDto {
  @ApiProperty({ example: 'w-ivory-tee', description: 'Product id.' })
  @IsString()
  @MinLength(1)
  productId: string;

  @ApiProperty({ example: 'M' })
  @IsString()
  size: string;

  @ApiProperty({ example: 'Ivory' })
  @IsString()
  color: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  /**
   * The lines being ordered, capped at the same 200 the cart accepts (see
   * PutCartDto) because an order is only ever placed from a cart.
   *
   * The cap is what keeps every later read of this order bounded: an order's
   * items are always loaded whole (`INCLUDE_ITEMS` / `ADMIN_INCLUDE`, the
   * customer's order history, the admin orders table, the customer detail
   * sheet, the invoice and the confirmation emails all need the full set, so
   * none of them can paginate it). Without a write-time limit a single crafted
   * checkout could give one order an unbounded item count, and that order would
   * then drag its entire line set into every paginated list that contains it.
   */
  @ApiProperty({ type: [OrderItemInputDto], maxItems: 200 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiProperty({ example: 199, description: 'Shipping cost in whole INR.' })
  @IsInt()
  @Min(0)
  shipping: number;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Ignored — the server recomputes the discount from `couponCode` so ' +
      'totals cannot be tampered with. Kept for backward compatibility.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: 'SAVE20',
    description: 'Coupon code to apply. Validated and priced server-side.',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ example: 'amit@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Card ending •••• 4242',
    description: 'Masked payment display label only — no payment data is stored.',
  })
  @IsString()
  paymentLabel: string;
}

/** An order line, shaped to the client's `CartItem` interface. */
export class OrderItemResponseDto {
  @ApiProperty({ example: 'w-ivory-tee' })
  productId: string;

  @ApiProperty({ example: 'w-ivory-tee' })
  slug: string;

  @ApiProperty({ example: 'Ivory Everyday Tee' })
  title: string;

  @ApiProperty({ example: 'https://…/tee.jpg' })
  image: string;

  @ApiProperty({ example: 1290 })
  price: number;

  @ApiProperty({ example: 'M' })
  size: string;

  @ApiProperty({ example: 'Ivory' })
  color: string;

  @ApiProperty({ example: 2 })
  quantity: number;
}

/** A serialised order, shaped to the client's `MockOrder` interface. `id` is the
 *  human order number (e.g. "JB-284917") that the client routes and prints by. */
export class OrderResponseDto {
  @ApiProperty({ example: 'JB-284917', description: 'Public order number (the client id).' })
  id: string;

  @ApiProperty({ example: '2026-08-16T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ example: 2580 })
  subtotal: number;

  @ApiProperty({ example: 199 })
  shipping: number;

  @ApiProperty({ example: 0 })
  discount: number;

  @ApiPropertyOptional({ example: 'SAVE20', description: 'Coupon applied, if any.' })
  couponCode?: string | null;

  @ApiProperty({ example: 2779 })
  total: number;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.processing })
  status: OrderStatus;

  @ApiProperty({ type: AddressDto })
  address: AddressDto;

  @ApiProperty({ example: 'amit@example.com' })
  email: string;

  @ApiProperty({ example: 'Card ending •••• 4242' })
  paymentLabel: string;
}

/** Paginated order-history envelope. */
export class OrderListResponseDto extends PaginatedResponseDto<OrderResponseDto> {
  @ApiProperty({ type: [OrderResponseDto] })
  declare data: OrderResponseDto[];
}
