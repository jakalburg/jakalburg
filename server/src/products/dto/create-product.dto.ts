import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Gender } from '@prisma/client';

/** A colour option for the product (name + CSS hex swatch). */
export class ProductColorDto {
  @ApiProperty({ example: 'Ivory' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#f4efe6', description: 'CSS hex swatch colour.' })
  @IsString()
  @IsNotEmpty()
  hex: string;

  @ApiPropertyOptional({ example: 0, description: 'Display order (0-based).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

/**
 * Payload for creating a product. Mirrors the lean storefront Product model
 * (server/prisma/models/Product.prisma) so an admin-created product is
 * immediately consumable by the storefront with no shape translation.
 */
export class CreateProductDto {
  @ApiProperty({ example: 'Ivory Everyday Tee' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: 'w-ivory-tee',
    description: 'URL slug (unique). Auto-generated from the title when omitted.',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ enum: Gender, example: Gender.women })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 't-shirts', description: 'Category slug.' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 1290, description: 'Price in whole INR.' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    example: 1690,
    description: 'Original/strike-through price when on sale.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Ordered image URLs; [0] is the primary/card image.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ type: [String], example: ['XS', 'S', 'M', 'L', 'XL'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Sizes that are out of stock.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  soldOutSizes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ example: 'summer-essentials' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ example: false, description: 'Featured / essentials flag.' })
  @IsOptional()
  @IsBoolean()
  essential?: boolean;

  @ApiProperty({ example: 'A classic everyday tee in organic cotton.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '100% organic cotton' })
  @IsString()
  @IsNotEmpty()
  fabric: string;

  @ApiProperty({ example: 'Machine wash cold, tumble dry low.' })
  @IsString()
  @IsNotEmpty()
  care: string;

  @ApiPropertyOptional({ example: 42, description: 'Simple inventory count.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Storefront visibility. Defaults to true (immediately live).',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ProductColorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];
}
