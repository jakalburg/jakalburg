import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** A single line the client wants in its cart. Identity only + quantity — the
 *  server joins live Product data (title/image/price/slug) on read so pricing
 *  is never a stale snapshot. Matches the client key `productId::size::color`. */
export class CartItemInputDto {
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

  @ApiProperty({ example: 2, description: 'Quantity (clamped to >= 1).' })
  @IsInt()
  @Min(1)
  quantity: number;
}

/** Full-replace payload: the authoritative set of cart lines for this user. */
export class PutCartDto {
  @ApiProperty({ type: [CartItemInputDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CartItemInputDto)
  items: CartItemInputDto[];
}

/** A cart line enriched with live product data — shaped to the client's
 *  `CartItem` interface (client/src/types/index.ts) so the UI consumes it as-is. */
export class CartItemResponseDto {
  @ApiProperty({ example: 'w-ivory-tee' })
  productId: string;

  @ApiProperty({ example: 'w-ivory-tee' })
  slug: string;

  @ApiProperty({ example: 'Ivory Everyday Tee' })
  title: string;

  @ApiProperty({ example: 'https://…/tee.jpg', description: 'Primary image URL.' })
  image: string;

  @ApiProperty({ example: 1290, description: 'Live unit price in whole INR.' })
  price: number;

  @ApiProperty({ example: 'M' })
  size: string;

  @ApiProperty({ example: 'Ivory' })
  color: string;

  @ApiProperty({ example: 2 })
  quantity: number;
}

export class CartResponseDto {
  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];
}
