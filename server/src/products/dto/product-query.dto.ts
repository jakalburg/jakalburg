import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { Gender } from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination';

export const PRODUCT_SORTS = [
  'featured',
  'price-asc',
  'price-desc',
  'newest',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * Coerce a query-string flag to a real boolean.
 *
 * This reads `obj[key]` rather than `value` on purpose. The global pipe runs
 * with `enableImplicitConversion` (see main.ts), and class-transformer applies
 * that conversion BEFORE any `@Transform`, coercing every non-empty string via
 * `Boolean(...)` — so "false" and "0" both reach us as `true` and the string
 * checks below can never fire. `obj` still holds the untouched query value,
 * which is the only place the caller's real intent survives.
 */
const toBool = ({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): boolean | undefined => {
  const raw = obj?.[key];
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
};

/** Split a repeated or comma-separated query param into a clean string list. */
const toStringArray = ({ value }: { value: unknown }): string[] | undefined => {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const list = raw.map((v) => String(v).trim()).filter(Boolean);
  return list.length ? Array.from(new Set(list)) : undefined;
};

export class ProductQueryDto extends PaginationQueryDto {
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

  @ApiPropertyOptional({
    description: 'Only products offered in this size (e.g. "M").',
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Only products offered in this colour name (e.g. "Ivory").',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description:
      'Restrict to specific product ids (repeated or comma-separated). Used by ' +
      'the wishlist, which knows ids but not which page they live on.',
    type: [String],
  })
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
