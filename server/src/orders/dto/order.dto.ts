import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiProperty({ example: 199, description: 'Shipping cost in whole INR.' })
  @IsInt()
  @Min(0)
  shipping: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount in whole INR.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

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
