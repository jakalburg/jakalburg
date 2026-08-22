import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { Gender } from '@prisma/client';

export const PRODUCT_SORTS = [
  'featured',
  'price-asc',
  'price-desc',
  'newest',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Coerce a query-string flag to a real boolean (implicit conversion turns
 *  the string "false" into `true`, so parse it explicitly instead). */
const toBool = ({ value }: { value: unknown }): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

export class ProductQueryDto {
  @ApiPropertyOptional({ enum: Gender, description: 'Filter by gender.' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Filter by category slug.' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by collection slug.' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ description: 'Only new arrivals.' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ description: 'Only on-sale products.' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ description: 'Only essentials / featured products.' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  essential?: boolean;

  @ApiPropertyOptional({ description: 'Free-text search over title, description, tags.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, description: 'Sort order.' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort?: ProductSort;
}
