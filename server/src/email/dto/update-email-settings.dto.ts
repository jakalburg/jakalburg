import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Admin patch of the SMTP / email delivery settings. Every field is optional —
 * the admin form sends the whole set, but a partial patch is fine. Each field
 * the admin can send MUST be declared here or the global ValidationPipe
 * whitelist silently strips it.
 */
export class UpdateEmailSettingsDto {
  @ApiPropertyOptional({ example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'true for port 465, false for 587 (STARTTLS).',
  })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @ApiPropertyOptional({ example: 'you@gmail.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpUser?: string;

  @ApiPropertyOptional({
    description:
      'Write-only. Send it to change the password; omit or send empty to keep the current one. Stored encrypted and never returned.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtpPassword?: string;

  @ApiPropertyOptional({ example: 'support@jakalburgcreation.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpFromEmail?: string;

  @ApiPropertyOptional({ example: 'Jakalburg' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpFromName?: string;

  @ApiPropertyOptional({
    example: 'orders@example.com',
    description: 'Where new-order owner notifications are delivered.',
  })
  @IsOptional()
  @IsEmail({}, { message: 'ownerEmail must be a valid email address' })
  @MaxLength(255)
  ownerEmail?: string;
}
