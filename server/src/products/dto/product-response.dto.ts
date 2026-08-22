import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

/** A single colour option, matching the client's `ProductColor` shape. */
export class ProductColorResponseDto {
  @ApiProperty({ example: 'Ivory' })
  name: string;

  @ApiProperty({ example: '#f4efe6', description: 'CSS hex swatch colour.' })
  hex: string;
}

/**
 * Serialised product, shaped to the storefront's `Product` TypeScript
 * interface (client/src/types/index.ts) so the UI consumes it unchanged.
 */
export class ProductResponseDto {
  @ApiProperty({ example: 'ckv...' })
  id: string;

  @ApiProperty({ example: 'w-ivory-tee', description: 'URL slug (unique).' })
  slug: string;

  @ApiProperty({ example: 'Ivory Everyday Tee' })
  title: string;

  @ApiProperty({ enum: Gender, example: Gender.women })
  gender: Gender;

  @ApiProperty({ example: 't-shirts', description: 'Category slug.' })
  category: string;

  @ApiProperty({ example: 1290, description: 'Price in whole INR.' })
  price: number;

  @ApiPropertyOptional({
    example: 1690,
    description: 'Original price (strike-through) when on sale.',
  })
  compareAtPrice?: number;

  @ApiProperty({ type: [String], description: 'Ordered image URLs; [0] is primary.' })
  images: string[];

  @ApiProperty({ type: [ProductColorResponseDto] })
  colors: ProductColorResponseDto[];

  @ApiProperty({ type: [String], example: ['XS', 'S', 'M', 'L', 'XL'] })
  sizes: string[];

  @ApiProperty({ type: [String], description: 'Sizes that are out of stock.' })
  soldOutSizes: string[];

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ example: false })
  isNew: boolean;

  @ApiProperty({ example: false })
  onSale: boolean;

  @ApiPropertyOptional({ example: 'summer-essentials' })
  collection?: string;

  @ApiProperty({ example: false, description: 'Featured / essentials flag.' })
  essential: boolean;

  @ApiProperty()
  description: string;

  @ApiProperty({ example: '100% organic cotton' })
  fabric: string;

  @ApiProperty({ example: 'Machine wash cold, tumble dry low.' })
  care: string;

  @ApiProperty({ example: 42, description: 'Simple inventory count.' })
  stock: number;
}

/** Admin view of a product — adds the visibility flag + timestamps that the
 *  admin catalogue needs but the public storefront does not. */
export class AdminProductResponseDto extends ProductResponseDto {
  @ApiProperty({ example: true, description: 'Storefront visibility gate.' })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

/** Paginated admin product list envelope. */
export class AdminProductListResponseDto {
  @ApiProperty({ type: [AdminProductResponseDto] })
  data: AdminProductResponseDto[];

  @ApiProperty({ example: 24 })
  total: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 20 })
  take: number;

  @ApiProperty({ example: true })
  hasMore: boolean;
}
