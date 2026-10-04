import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { StorageSettingsService } from './storage-settings.service';

/**
 * CloudinaryService
 *
 * Thin wrapper over the Cloudinary SDK. Credentials come from the
 * StorageSettings singleton (seeded from CLOUDINARY_* on first read, then
 * editable in Settings → Media), so changing them takes effect on the next
 * upload rather than the next deploy.
 *
 * The SDK holds its configuration in a module-level global, so `apply()` is
 * called before every operation and re-applies only when the resolved
 * credentials have actually changed.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /** Identity of the credentials currently pushed into the SDK. */
  private appliedKey = '';
  private configured = false;

  constructor(private readonly storageSettings: StorageSettingsService) {}

  /**
   * Push the current credentials into the SDK. Returns whether Cloudinary is
   * usable. Cheap to call repeatedly — the resolve() behind it is memoised and
   * the SDK is only touched when something changed.
   */
  private async apply(): Promise<boolean> {
    const { cloudinary: config } = await this.storageSettings.resolve();

    if (!config.configured) {
      this.configured = false;
      this.appliedKey = '';
      return false;
    }

    const key = `${config.cloudName}:${config.apiKey}:${config.apiSecret}`;
    if (key === this.appliedKey) return true;

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
      // The SDK's default is short enough that a few-hundred-KB upload on a
      // slow link gives up with "Request Timeout". Uploads are interactive
      // (an admin is waiting), so prefer waiting over failing.
      timeout: 120_000,
    });
    this.appliedKey = key;
    this.configured = true;
    this.logger.log(`Cloudinary configured for cloud: ${config.cloudName}`);
    return true;
  }

  /** Whether Cloudinary has usable credentials right now. */
  async isConfigured(): Promise<boolean> {
    return this.apply();
  }

  /**
   * Open an authenticated session without transferring anything, and report
   * account storage usage. Backs the admin's Verify button and usage bar.
   */
  async ping(): Promise<void> {
    if (!(await this.apply())) {
      throw new Error('Cloudinary is not configured.');
    }
    await cloudinary.api.ping();
  }

  /** Account-level storage usage straight from Cloudinary. */
  async usage(): Promise<{
    usedBytes: number | null;
    limitBytes: number | null;
    fileCount: number | null;
  }> {
    if (!(await this.apply())) {
      throw new Error('Cloudinary is not configured.');
    }
    const report = (await cloudinary.api.usage()) as {
      storage?: { usage?: number; limit?: number };
      resources?: number;
    };
    return {
      usedBytes: report?.storage?.usage ?? null,
      limitBytes: report?.storage?.limit ?? null,
      fileCount: report?.resources ?? null,
    };
  }

  /** How many times to re-attempt an upload that timed out. */
  private static readonly MAX_ATTEMPTS = 3;

  /**
   * Upload a file buffer to Cloudinary and return its secure URL + public id.
   * Applies f_auto,q_auto delivery so browsers that can't render the source
   * format (e.g. iPhone HEIC) still get a compatible image.
   *
   * Retries on timeout: Cloudinary intermittently drops a connection mid-upload
   * and an admin shouldn't lose a whole form to a transient network blip.
   * Non-timeout failures (bad credentials, rejected format) fail immediately —
   * retrying those just wastes the admin's time.
   */
  async upload(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!(await this.apply())) {
      throw new Error(
        'Cloudinary is not configured. Add the cloud name, API key and API ' +
          'secret in Settings → Media (or set CLOUDINARY_* in server/.env).',
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= CloudinaryService.MAX_ATTEMPTS; attempt++) {
      try {
        return await this.uploadOnce(buffer, folder, fileName, mimeType);
      } catch (error) {
        lastError = error as Error;
        if (!this.isTimeout(lastError)) break;

        this.logger.warn(
          `Cloudinary upload timed out for "${fileName}" ` +
            `(attempt ${attempt}/${CloudinaryService.MAX_ATTEMPTS})`,
        );
      }
    }

    this.logger.error(
      `Cloudinary upload failed for "${fileName}": ${lastError?.message ?? 'no result'}`,
    );
    throw lastError ?? new Error('Cloudinary upload returned no result');
  }

  /** True for the transient "Request Timeout" the SDK surfaces on a slow link. */
  private isTimeout(error: Error): boolean {
    const code = (error as { http_code?: number }).http_code;
    return code === 499 || /timeout/i.test(error.message ?? '');
  }

  /** A single upload attempt. */
  private uploadOnce(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^\w-]+/g, '-');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `jakalburg/${folder}`,
          resource_type: resourceType,
          public_id: `${Date.now()}-${baseName}`,
          timeout: 120_000,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve({
            url: this.applyAutoFormat(result.secure_url),
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  /** Delete a file from Cloudinary by public id. Best-effort. */
  async delete(publicId: string, resourceType = 'image'): Promise<void> {
    if (!(await this.apply())) {
      this.logger.warn('Cloudinary not configured, skipping delete.');
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      this.logger.log(`Cloudinary file deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`Cloudinary delete failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Extract the public id from a Cloudinary URL, so a stored image URL can be
   * turned back into something `delete()` accepts.
   * Format: https://res.cloudinary.com/{cloud}/image/upload/v{n}/{folder}/{id}.{ext}
   */
  extractPublicId(url: string): string | null {
    const afterUpload = url.split('/upload/')[1];
    if (!afterUpload) return null;
    const publicId = afterUpload
      .replace(/^[^/]*[,][^/]*\//, '') // leading transformation segment (has a comma), e.g. f_auto,q_auto/
      .replace(/^v\d+\//, '') // version, e.g. v1712345678/
      .replace(/\.\w+$/, ''); // extension
    // The folder is part of the public id (e.g. "jakalburg/products/173…-shirt").
    return publicId || null;
  }

  private applyAutoFormat(url: string): string {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
}
