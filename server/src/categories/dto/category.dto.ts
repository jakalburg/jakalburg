import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * A category slug is the literal value stored on `Product.category`, so it has
 * to match what the catalogue and the storefront routes already use:
 * lowercase, digits and single hyphens ("co-ord-sets", "t-shirts").
 */
export const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Co-ord sets' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional({
    example: 'co-ord-sets',
    description:
      'The value stored on products. Derived from the name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(CATEGORY_SLUG_PATTERN, {
    message:
      'slug must be lowercase words separated by single hyphens, e.g. "co-ord-sets"',
  })
  slug?: string;

  @ApiPropertyOptional({
    enum: Gender,
    isArray: true,
    description:
      'Genders this category is offered under. Empty means any gender that has stock.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Gender, { each: true })
  genders?: Gender[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Image URL (Cloudinary or R2).' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/**
 * Every field optional. `slug` is included: renaming a category's slug is a
 * real operation, but it does NOT rewrite the products pointing at the old
 * value — see CategoriesService.update for why that's a deliberate refusal.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
