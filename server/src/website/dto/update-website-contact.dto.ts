import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin patch of the storefront Contact page content. Every field is optional —
 * the admin form sends the whole set, but a partial patch is fine too. Each
 * field the admin can send MUST be declared here or the global ValidationPipe
 * whitelist silently strips it.
 */
export class UpdateWebsiteContactDto {
  @ApiPropertyOptional({ example: 'care@jakalburg.com' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Bandra West, Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: 'https://maps.google.com/?q=...',
    description: 'Google Maps URL. Optional; the storefront links the address to it when set.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mapLink?: string;

  @ApiPropertyOptional({ example: "We're here to help." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Questions about a piece, an order, or fit?' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  formDescription?: string;

  @ApiPropertyOptional({ example: 'Need It Today?' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  needTodayTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  needTodayDescription?: string;

  @ApiPropertyOptional({ description: 'Admin banner image URL (not shown on the storefront).' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contactImage?: string;
}
