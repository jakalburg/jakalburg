import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/pagination';

/** A single colour option, matching the client's `ProductColor` shape.
 *  Per-colour variant fields are empty/undefined when the colour inherits the
 *  product-level default; the storefront applies that fallback at render time. */
export class ProductColorResponseDto {
  @ApiProperty({ example: 'Ivory' })
  name: string;

  @ApiProperty({ example: '#f4efe6', description: 'CSS hex swatch colour.' })
  hex: string;

  @ApiProperty({
    type: [String],
    description: "This colour's images (empty → fall back to the product images).",
  })
  images: string[];

  @ApiProperty({
    type: [String],
    description: "This colour's sizes (empty → fall back to the product sizes).",
  })
  sizes: string[];

  @ApiProperty({ type: [String], description: 'Sold-out sizes for this colour.' })
  soldOutSizes: string[];

  @ApiPropertyOptional({ example: 1290, description: 'Per-colour price override.' })
  price?: number;

  @ApiPropertyOptional({ example: 1690, description: 'Per-colour compare-at override.' })
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 42, description: 'Per-colour stock override.' })
  stock?: number;
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

  @ApiPropertyOptional({ example: 'summer-essentials', deprecated: true })
  collection?: string;

  @ApiProperty({
    type: [String],
    example: ['summer-essentials', 'monochrome'],
    description: 'Collection slugs this product belongs to.',
  })
  collections: string[];

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

  @ApiProperty({
    example: 4.6,
    description:
      'Mean of APPROVED review ratings (1 dp); 0 when there are none yet.',
  })
  avgRating: number;

  @ApiProperty({ example: 23, description: 'Number of approved reviews.' })
  reviewCount: number;

  @ApiProperty({
    example: false,
    description:
      "When true, the storefront hides this product's reviews section and " +
      'its star rating. The review data itself is kept and can be re-shown.',
  })
  reviewsHidden: boolean;
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
export class AdminProductListResponseDto extends PaginatedResponseDto<AdminProductResponseDto> {
  @ApiProperty({ type: [AdminProductResponseDto] })
  declare data: AdminProductResponseDto[];
}

/** Paginated storefront product list envelope. */
export class ProductListResponseDto extends PaginatedResponseDto<ProductResponseDto> {
  @ApiProperty({ type: [ProductResponseDto] })
  declare data: ProductResponseDto[];
}

/** Distinct filter values across a slice of the catalogue. */
export class ProductFacetsResponseDto {
  @ApiProperty({ type: [String], example: ['XS', 'S', 'M', 'L'] })
  sizes: string[];

  @ApiProperty({ type: [String], example: ['Ivory', 'Black'] })
  colors: string[];
}
