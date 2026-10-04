import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { decryptSecret, encryptSecret } from '../common/crypto.util';
import { UpdateStorageSettingsDto } from './dto/update-storage-settings.dto';

export type StorageProvider = 'cloudinary' | 'r2';

export interface ResolvedCloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Manual fallback quota in bytes; null when Cloudinary reports its own. */
  storageLimitBytes: number | null;
  configured: boolean;
}

export interface ResolvedR2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicUrl: string;
  storageLimitBytes: number | null;
  configured: boolean;
}

export interface ResolvedRedisConfig {
  enabled: boolean;
  url: string;
  token: string;
  /** enabled AND both credentials present — i.e. safe to build a client. */
  usable: boolean;
}

export interface ResolvedStorageConfig {
  provider: StorageProvider;
  cloudinary: ResolvedCloudinaryConfig;
  r2: ResolvedR2Config;
  redis: ResolvedRedisConfig;
}

/** The admin-facing view. Note the absence of all three secrets — only
 *  whether each is set is ever exposed. */
export interface StorageSettingsView {
  id: string;
  storageProvider: StorageProvider;

  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryStorageLimitBytes: number | null;
  isCloudinaryConfigured: boolean;

  r2AccountId: string;
  r2AccessKeyId: string;
  r2BucketName: string;
  r2Endpoint: string;
  r2PublicUrl: string;
  r2StorageLimitBytes: number | null;
  isR2Configured: boolean;

  redisEnabled: boolean;
  redisUrl: string;
  isRedisConfigured: boolean;
}

/**
 * StorageSettingsService — persistence for the admin's Settings → Media screen.
 *
 * Singleton, same shape as EmailSettingsService: one row, created on first read
 * and seeded from the CLOUDINARY_* env vars so an existing deployment keeps
 * uploading without any manual step. The three secrets are encrypted at rest
 * and never leave the server.
 *
 * `resolve()` is the single read used by CloudinaryService, R2Service and
 * RedisService. It is memoised, so the hot upload path costs no extra database
 * round-trip; `update()` drops the memo, which is what makes an admin edit take
 * effect on the next request rather than the next deploy.
 */
@Injectable()
export class StorageSettingsService {
  private readonly logger = new Logger(StorageSettingsService.name);

  private cached: ResolvedStorageConfig | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The singleton, created on first read and seeded from the CLOUDINARY_* env
   * vars. R2 and Redis have no env fallback by design — they are configured
   * entirely from the admin screen, so a fresh install starts with them off.
   */
  private async getRow() {
    const existing = await this.prisma.storageSettings.findFirst();
    if (existing) return existing;

    this.logger.log(
      'Seeding StorageSettings from CLOUDINARY_* environment variables',
    );
    return this.prisma.storageSettings.create({
      data: {
        storageProvider: 'cloudinary',
        cloudinaryCloudName: env.CLOUDINARY_CLOUD_NAME || null,
        cloudinaryApiKey: env.CLOUDINARY_API_KEY || null,
        cloudinaryApiSecret: env.CLOUDINARY_API_SECRET
          ? encryptSecret(env.CLOUDINARY_API_SECRET)
          : null,
      },
    });
  }

  /** Admin read — never includes any secret. */
  async getForAdmin(): Promise<StorageSettingsView> {
    const row = await this.getRow();
    const config = await this.resolve();

    return {
      id: row.id,
      storageProvider: config.provider,

      cloudinaryCloudName: row.cloudinaryCloudName ?? '',
      cloudinaryApiKey: row.cloudinaryApiKey ?? '',
      cloudinaryStorageLimitBytes: row.cloudinaryStorageLimitBytes ?? null,
      isCloudinaryConfigured: config.cloudinary.configured,

      r2AccountId: row.r2AccountId ?? '',
      r2AccessKeyId: row.r2AccessKeyId ?? '',
      r2BucketName: row.r2BucketName ?? '',
      r2Endpoint: row.r2Endpoint ?? '',
      r2PublicUrl: row.r2PublicUrl ?? '',
      r2StorageLimitBytes: row.r2StorageLimitBytes ?? null,
      isR2Configured: config.r2.configured,

      redisEnabled: row.redisEnabled,
      redisUrl: row.redisUrl ?? '',
      isRedisConfigured: Boolean(config.redis.url && config.redis.token),
    };
  }

  /**
   * Admin write. Each secret is only touched when a non-empty value is sent —
   * the admin form submits a blank field to mean "leave it alone", so saving
   * a bucket name can never wipe a working credential.
   */
  async update(dto: UpdateStorageSettingsDto): Promise<StorageSettingsView> {
    const row = await this.getRow();

    const data: Record<string, unknown> = {};

    if (dto.storageProvider !== undefined)
      data.storageProvider = dto.storageProvider;

    if (dto.cloudinaryCloudName !== undefined)
      data.cloudinaryCloudName = dto.cloudinaryCloudName;
    if (dto.cloudinaryApiKey !== undefined)
      data.cloudinaryApiKey = dto.cloudinaryApiKey;
    if (dto.cloudinaryStorageLimitBytes !== undefined)
      data.cloudinaryStorageLimitBytes = dto.cloudinaryStorageLimitBytes;

    if (dto.r2AccountId !== undefined) data.r2AccountId = dto.r2AccountId;
    if (dto.r2AccessKeyId !== undefined) data.r2AccessKeyId = dto.r2AccessKeyId;
    if (dto.r2BucketName !== undefined) data.r2BucketName = dto.r2BucketName;
    if (dto.r2Endpoint !== undefined) data.r2Endpoint = dto.r2Endpoint;
    if (dto.r2PublicUrl !== undefined) data.r2PublicUrl = dto.r2PublicUrl;
    if (dto.r2StorageLimitBytes !== undefined)
      data.r2StorageLimitBytes = dto.r2StorageLimitBytes;

    if (dto.redisEnabled !== undefined) data.redisEnabled = dto.redisEnabled;
    if (dto.redisUrl !== undefined) data.redisUrl = dto.redisUrl;

    // Secrets: written only when a new value actually arrived.
    if (dto.cloudinaryApiSecret)
      data.cloudinaryApiSecret = encryptSecret(dto.cloudinaryApiSecret);
    if (dto.r2SecretAccessKey)
      data.r2SecretAccessKey = encryptSecret(dto.r2SecretAccessKey);
    if (dto.redisToken) data.redisToken = encryptSecret(dto.redisToken);

    await this.prisma.storageSettings.update({ where: { id: row.id }, data });
    this.invalidate(); // next upload / cache read picks up the change
    return this.getForAdmin();
  }

  /**
   * Config for every consumer. DB first, env as the fallback per field.
   *
   * NEVER throws. The cache sits in front of most storefront reads, and
   * RedisService asks for this config on every one of them — so if a database
   * blip (or a schema that hasn't been pushed yet) could throw here, it would
   * take down every cached read path with it. On failure we degrade to
   * env-only config: Cloudinary keeps working, R2 and the cache stay off.
   */
  async resolve(): Promise<ResolvedStorageConfig> {
    if (this.cached) return this.cached;

    let row: Awaited<ReturnType<typeof this.getRow>>;
    try {
      row = await this.getRow();
    } catch (error) {
      this.logger.warn(
        `Could not read StorageSettings (${
          error instanceof Error ? error.message : 'unknown error'
        }). Falling back to environment configuration.`,
      );
      // Deliberately not memoised, so the next call recovers once the table
      // exists or the database comes back.
      return this.envOnlyConfig();
    }

    const cloudName = row.cloudinaryCloudName || env.CLOUDINARY_CLOUD_NAME;
    const apiKey = row.cloudinaryApiKey || env.CLOUDINARY_API_KEY;
    const apiSecret =
      decryptSecret(row.cloudinaryApiSecret) || env.CLOUDINARY_API_SECRET;

    const r2SecretAccessKey = decryptSecret(row.r2SecretAccessKey);
    const redisToken = decryptSecret(row.redisToken);
    const redisUrl = row.redisUrl ?? '';

    const resolved: ResolvedStorageConfig = {
      provider: (row.storageProvider as StorageProvider) || 'cloudinary',
      cloudinary: {
        cloudName,
        apiKey,
        apiSecret,
        storageLimitBytes: row.cloudinaryStorageLimitBytes ?? null,
        configured: Boolean(cloudName && apiKey && apiSecret),
      },
      r2: {
        accountId: row.r2AccountId ?? '',
        accessKeyId: row.r2AccessKeyId ?? '',
        secretAccessKey: r2SecretAccessKey,
        bucketName: row.r2BucketName ?? '',
        endpoint: row.r2Endpoint ?? '',
        publicUrl: row.r2PublicUrl ?? '',
        storageLimitBytes: row.r2StorageLimitBytes ?? null,
        configured: Boolean(
          row.r2AccessKeyId &&
            r2SecretAccessKey &&
            row.r2Endpoint &&
            row.r2BucketName,
        ),
      },
      redis: {
        enabled: row.redisEnabled,
        url: redisUrl,
        token: redisToken,
        usable: Boolean(row.redisEnabled && redisUrl && redisToken),
      },
    };

    this.cached = resolved;
    return resolved;
  }

  /**
   * What `resolve()` returns when the StorageSettings row is unreachable:
   * Cloudinary straight from env, everything else off. This is also exactly
   * the behaviour the server had before this module existed.
   */
  private envOnlyConfig(): ResolvedStorageConfig {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    return {
      provider: 'cloudinary',
      cloudinary: {
        cloudName,
        apiKey,
        apiSecret,
        storageLimitBytes: null,
        configured: Boolean(cloudName && apiKey && apiSecret),
      },
      r2: {
        accountId: '',
        accessKeyId: '',
        secretAccessKey: '',
        bucketName: '',
        endpoint: '',
        publicUrl: '',
        storageLimitBytes: null,
        configured: false,
      },
      redis: { enabled: false, url: '', token: '', usable: false },
    };
  }

  /** Drop the memo so the next resolve() re-reads the row. */
  invalidate(): void {
    this.cached = null;
  }
}
