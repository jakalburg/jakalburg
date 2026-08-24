import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Partial update for a home section. The admin's Home Setup tab PATCHes one or a
 * few fields at a time (title/eyebrow/subtitle inline edits, the enabled/gridBg/
 * padding toggles, order re-shuffles, and the whole `data` blob from a section's
 * config modal). Every field it may send MUST be declared here — the global
 * ValidationPipe (whitelist:true) silently strips any property without a
 * validation decorator.
 */
export class UpdateHomeSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eyebrow?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  gridBg?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paddingTop?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paddingBottom?: boolean;

  // HeroSlider only: full-bleed photo hero (true) vs split text+image layout
  // (false, the default). Declared here so the whitelist doesn't strip it.
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fullBleed?: boolean;

  // Arbitrary section content (HeroSlider: an array of slides). No shape
  // validation — @IsOptional() alone is enough to survive the whitelist.
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  data?: any;
}
