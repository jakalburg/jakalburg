import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StorageSettingsService } from './storage-settings.service';

/** Safety valve on the usage scan: 10 pages × 1000 keys. Beyond that the
 *  figure is reported as a lower bound rather than paging forever. */
const USAGE_MAX_PAGES = 10;

/**
 * R2Service — Cloudflare R2 (S3-compatible) as an alternative media backend.
 *
 * Credentials come from the StorageSettings singleton, so the client is built
 * lazily and rebuilt when the admin saves new ones. Nothing here runs until R2
 * credentials are actually saved; with none, every method reports
 * "not configured" rather than throwing at boot.
 */
@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);

  private client: S3Client | null = null;
  /** Identity of the config the current client was built from. */
  private clientKey = '';

  constructor(private readonly storageSettings: StorageSettingsService) {}

  /** The S3 client, or null when R2 isn't fully configured. */
  private async getClient(): Promise<S3Client | null> {
    const { r2 } = await this.storageSettings.resolve();
    if (!r2.configured) {
      this.client = null;
      this.clientKey = '';
      return null;
    }

    const key = `${r2.endpoint}:${r2.accessKeyId}:${r2.secretAccessKey}`;
    if (this.client && key === this.clientKey) return this.client;

    try {
      this.client = new S3Client({
        region: 'auto',
        endpoint: r2.endpoint,
        forcePathStyle: true,
        credentials: {
          accessKeyId: r2.accessKeyId,
          secretAccessKey: r2.secretAccessKey,
        },
        // R2 rejects the checksum headers the v3 SDK adds by default.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });
      this.clientKey = key;
      this.logger.log(`R2 client initialised for bucket: ${r2.bucketName}`);
      return this.client;
    } catch (error) {
      this.logger.warn(
        `Failed to initialise R2 client: ${(error as Error).message}`,
      );
      this.client = null;
      this.clientKey = '';
      return null;
    }
  }

  async isConfigured(): Promise<boolean> {
    return (await this.getClient()) !== null;
  }

  /**
   * Upload a buffer and return its public URL. The object key mirrors the
   * Cloudinary folder convention so both providers lay files out the same way.
   */
  async upload(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    const client = await this.getClient();
    const { r2 } = await this.storageSettings.resolve();

    if (!client) {
      throw new Error(
        'Cloudflare R2 is not configured. Add the account ID, access key, ' +
          'secret, bucket and endpoint in Settings → Media.',
      );
    }
    if (!r2.publicUrl) {
      throw new Error(
        'Cloudflare R2 has no public URL set, so uploaded files would not be ' +
          'reachable. Add it in Settings → Media.',
      );
    }

    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^\w-]+/g, '-');
    const extension = (fileName.match(/\.[^/.]+$/)?.[0] ?? '').toLowerCase();
    const key = `jakalburg/${folder}/${Date.now()}-${baseName}${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return {
      url: `${r2.publicUrl.replace(/\/+$/, '')}/${key}`,
      publicId: key,
    };
  }

  /** Delete one object by its key. Best-effort. */
  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    const { r2 } = await this.storageSettings.resolve();
    if (!client) {
      this.logger.warn('R2 not configured, skipping delete.');
      return;
    }

    await client.send(
      new DeleteObjectCommand({ Bucket: r2.bucketName, Key: key }),
    );
    this.logger.log(`R2 object deleted: ${key}`);
  }

  /**
   * Turn a stored public URL back into an object key, so a URL held on a
   * Product can be deleted. Returns null when the URL isn't ours.
   */
  async extractKey(url: string): Promise<string | null> {
    const { r2 } = await this.storageSettings.resolve();
    if (!r2.publicUrl) return null;

    const base = r2.publicUrl.replace(/\/+$/, '');
    if (!url.startsWith(base)) return null;

    const key = url.slice(base.length).replace(/^\/+/, '');
    return key || null;
  }

  /** Open an authenticated session without transferring anything. */
  async ping(): Promise<void> {
    const client = await this.getClient();
    const { r2 } = await this.storageSettings.resolve();
    if (!client) throw new Error('Cloudflare R2 is not configured.');

    // Listing one key proves both the credentials AND that the bucket exists,
    // which ListBuckets alone would not.
    await client.send(
      new ListObjectsV2Command({ Bucket: r2.bucketName, MaxKeys: 1 }),
    );
  }

  /**
   * Sum object sizes in the bucket. R2 exposes no usage API, so this pages
   * through ListObjectsV2 — one Class A operation per page, against a free
   * allowance of 1,000,000 per month.
   */
  async usage(): Promise<{
    usedBytes: number;
    fileCount: number;
    truncated: boolean;
  }> {
    const client = await this.getClient();
    const { r2 } = await this.storageSettings.resolve();
    if (!client) throw new Error('Cloudflare R2 is not configured.');

    let usedBytes = 0;
    let fileCount = 0;
    let token: string | undefined;
    let pages = 0;

    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: r2.bucketName,
          ContinuationToken: token,
        }),
      );
      for (const object of page.Contents ?? []) {
        usedBytes += object.Size ?? 0;
        fileCount++;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
      pages++;
    } while (token && pages < USAGE_MAX_PAGES);

    return { usedBytes, fileCount, truncated: Boolean(token) };
  }
}
