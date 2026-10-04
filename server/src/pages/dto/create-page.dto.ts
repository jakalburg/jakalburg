import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** One question/answer row inside a FAQ section. */
export class FaqItemDto {
  @ApiProperty({ example: 'How long will my order take?' })
  @IsString()
  @MaxLength(500)
  question: string;

  @ApiProperty({ example: 'Standard shipping arrives in 3–5 business days.' })
  @IsString()
  @MaxLength(5000)
  answer: string;
}

/**
 * A heading with the Q&A that sits under it. This grouping is what Jakalburg's
 * FAQ has and the kaybykhushie reference does not — the storefront renders one
 * accordion per section, under the section heading.
 */
export class FaqSectionDto {
  @ApiProperty({ example: 'Orders' })
  @IsString()
  @MaxLength(200)
  heading: string;

  @ApiProperty({ type: [FaqItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  items: FaqItemDto[];
}

export class CreatePageDto {
  @ApiProperty({ example: 'Shipping' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'shipping-policy',
    description: 'Lowercase, hyphenated. Matches the storefront route.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must only contain lowercase letters, numbers and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Rich-text HTML from the admin editor. Unused by the FAQ page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  content?: string;

  @ApiPropertyOptional({
    type: [FaqSectionDto],
    description: 'FAQ page only — headings each holding their own Q&A list.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqSectionDto)
  faqSections?: FaqSectionDto[];

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
