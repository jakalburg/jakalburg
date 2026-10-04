import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Admin patch of the media-storage and cache settings. Every field is optional
 * — the admin screen saves one card at a time. Each field the admin can send
 * MUST be declared here or the global ValidationPipe whitelist silently strips
 * it.
 *
 * The three secrets are write-only: send one to change it, omit it to keep the
 * stored value. None of them is ever returned by a read.
 */
export class UpdateStorageSettingsDto {
  @ApiPropertyOptional({
    enum: ['cloudinary', 'r2'],
    description: 'Routes NEW uploads only; existing files are unaffected.',
  })
  @IsOptional()
  @IsIn(['cloudinary', 'r2'])
  storageProvider?: 'cloudinary' | 'r2';

  // ---- Cloudinary ----

  @ApiPropertyOptional({ example: 'dxxxxxxxx' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cloudinaryCloudName?: string;

  @ApiPropertyOptional({ example: '123456789012345' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cloudinaryApiKey?: string;

  @ApiPropertyOptional({
    description:
      'Write-only. Send to change; omit or send empty to keep the current one. Stored encrypted and never returned.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cloudinaryApiSecret?: string;

  @ApiPropertyOptional({
    description:
      'Manual quota in bytes, used only when Cloudinary reports no limit of its own. Send null to clear.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cloudinaryStorageLimitBytes?: number | null;

  // ---- Cloudflare R2 ----

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  r2AccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  r2AccessKeyId?: string;

  @ApiPropertyOptional({
    description:
      'Write-only. Send to change; omit or send empty to keep the current one. Stored encrypted and never returned.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  r2SecretAccessKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  r2BucketName?: string;

  @ApiPropertyOptional({
    example: 'https://<account-id>.r2.cloudflarestorage.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  r2Endpoint?: string;

  @ApiPropertyOptional({ example: 'https://pub-xxxxxxxx.r2.dev' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  r2PublicUrl?: string;

  @ApiPropertyOptional({
    description: 'Tracking-only limit in bytes; R2 has no hard quota.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  r2StorageLimitBytes?: number | null;

  // ---- Upstash Redis ----

  @ApiPropertyOptional({
    description: 'When false every cached read falls through to Postgres.',
  })
  @IsOptional()
  @IsBoolean()
  redisEnabled?: boolean;

  @ApiPropertyOptional({ example: 'https://xxxx.upstash.io' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  redisUrl?: string;

  @ApiPropertyOptional({
    description:
      'Write-only. Send to change; omit or send empty to keep the current one. Stored encrypted and never returned.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  redisToken?: string;
}
