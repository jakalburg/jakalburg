import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * Admin patch of maintenance mode. Each field the admin can send MUST be
 * declared here or the global ValidationPipe whitelist silently strips it.
 *
 * The preview token is deliberately absent: it is never set by hand, only
 * minted by POST /settings/maintenance/preview-token.
 */
export class UpdateMaintenanceDto {
  @ApiPropertyOptional({
    description:
      'Master switch. True blocks the storefront and makes the API answer 503.',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'We’ll be back shortly' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: 'The shop is closed for scheduled maintenance.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({
    description:
      'Presentational "expected back at", ISO-8601. Drives the countdown; never lifts maintenance on its own. Send null to clear.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  endsAt?: string | null;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
