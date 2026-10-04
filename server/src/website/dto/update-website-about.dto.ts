import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin patch of the storefront About page content. Every field is optional —
 * the admin form sends the whole set, but a partial patch is fine too. Each
 * field the admin can send MUST be declared here or the global ValidationPipe
 * whitelist silently strips it.
 */
export class UpdateWebsiteAboutDto {
  @ApiPropertyOptional({ example: 'Our story' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @ApiPropertyOptional({ example: 'A small studio, patient work.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({
    description: 'Body copy. Blank lines separate paragraphs on the storefront.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiPropertyOptional({ description: 'Hero image URL.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageMain?: string;

  @ApiPropertyOptional({ description: 'Edited in the admin, not rendered today.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  imageSub?: string;

  @ApiPropertyOptional({ description: 'Edited in the admin, not rendered today.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  videoMain?: string;

  @ApiPropertyOptional({ description: 'Edited in the admin, not rendered today.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  founderQuote?: string;

  @ApiPropertyOptional({ description: 'Edited in the admin, not rendered today.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  founderText?: string;
}
