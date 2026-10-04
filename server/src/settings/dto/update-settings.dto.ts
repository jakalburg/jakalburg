import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin patch of the global store settings. Every field is optional — the
 * admin form sends the whole set, but a partial patch is fine too.
 *
 * Each field the admin can send MUST be declared here or the global
 * ValidationPipe whitelist silently strips it.
 *
 * URLs are typed as plain strings rather than @IsUrl() on purpose: the admin
 * clears a field by sending "", which @IsUrl() would reject.
 */
export class UpdateSettingsDto {
  // ---- Brand identity ----

  @ApiPropertyOptional({ example: 'Jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeName?: string;

  @ApiPropertyOptional({ example: 'Considered wardrobe essentials.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Full wordmark URL (header + footer).' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logo?: string;

  @ApiPropertyOptional({ description: 'Compact mark URL (tight spots, og:image).' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  miniLogo?: string;

  @ApiPropertyOptional({ description: 'Browser tab icon URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  favicon?: string;

  // ---- Global contact details ----

  @ApiPropertyOptional({ example: 'care@jakalburg.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  phone?: string;

  @ApiPropertyOptional({ description: 'Full store address.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @ApiPropertyOptional({ description: 'Google Maps URL the address links to.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mapLink?: string;

  // ---- Social accounts ----

  @ApiPropertyOptional({ example: 'https://facebook.com/jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  facebookUrl?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://x.com/jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  twitterUrl?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  youtubeUrl?: string;

  // ---- SEO defaults ----

  @ApiPropertyOptional({ example: 'Jakalburg — Considered wardrobe essentials' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'Default meta description.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  seoDescription?: string;

  @ApiPropertyOptional({
    example: 'https://jakalburg.com',
    description: 'Absolute origin used to build canonical URLs.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  siteUrl?: string;
}
