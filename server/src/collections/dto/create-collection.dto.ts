import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Payload for creating a collection. `title` is the only required field; the
 * slug is auto-generated from it when omitted. The slug doubles as the
 * product-membership key (Product.collections), so it is NOT auto-changed on a
 * later title edit — that would orphan already-tagged products.
 */
export class CreateCollectionDto {
  @ApiProperty({ example: 'Summer Essentials' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({
    example: 'summer-essentials',
    description: 'URL/membership slug (unique). Auto-generated from the title when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  slug?: string;

  @ApiPropertyOptional({ example: 'Linen, cotton, ease.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Cover photo URL (Cloudinary or pasted).' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: 'Longer copy for the collection page.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true, description: 'Storefront visibility (default true).' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Display order (ascending).' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
