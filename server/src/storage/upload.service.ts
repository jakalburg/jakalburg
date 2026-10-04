import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { R2Service } from './r2.service';
import { StorageSettingsService } from './storage-settings.service';
import { env } from '../config/env';
import { ImageUploadResponseDto } from './dto/upload-response.dto';

/** One provider's slice of the Settings → Media usage panel. */
export interface ProviderUsage {
  provider: 'cloudinary' | 'r2';
  configured: boolean;
  usedBytes: number | null;
  usedHuman: string;
  limitBytes: number | null;
  limitHuman: string;
  percentUsed: number | null;
  fileCount: number | null;
  /** Where the numbers came from, or why they're missing. */
  note: string;
  error?: string;
}

/**
 * UploadService
 *
 * Validates incoming image files and pushes them to the ACTIVE provider —
 * Cloudinary or Cloudflare R2, chosen in Settings → Media. The returned URLs
 * are stored directly on Product.images[] by the admin; there is no Media
 * table (unlike the kaybykhushie reference). Folder is fixed to "products".
 *
 * Switching provider affects NEW uploads only. Existing files keep their
 * absolute URLs and keep resolving, which is why `deleteByUrl` dispatches on
 * the URL itself rather than on the active provider — otherwise the day you
 * switch to R2, deleting any older image would silently miss and orphan the
 * Cloudinary file.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  private readonly imageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/heic',
    'image/heif',
    // Favicons (Settings → Store). Browsers send one of these two for .ico;
    // Cloudinary stores it as a normal image.
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ];

  constructor(
    private readonly cloudinary: CloudinaryService,
    private readonly r2: R2Service,
    private readonly storageSettings: StorageSettingsService,
  ) {}

  /** Push one file to whichever provider is currently active. */
  private async uploadOne(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    const { provider } = await this.storageSettings.resolve();
    return provider === 'r2'
      ? this.r2.upload(buffer, folder, fileName, mimeType)
      : this.cloudinary.upload(buffer, folder, fileName, mimeType);
  }

  /** Upload one or more images. Individual failures don't fail the batch. */
  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<ImageUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const result: ImageUploadResponseDto = {
      uploaded: [],
      failed: [],
      totalUploaded: 0,
      totalFailed: 0,
    };

    for (const file of files) {
      try {
        this.validateImage(file);
        const { url, publicId } = await this.uploadOne(
          file.buffer,
          'products',
          file.originalname,
          file.mimetype,
        );
        result.uploaded.push({ url, publicId });
        result.totalUploaded++;
      } catch (error) {
        this.logger.error(
          `Image upload failed for "${file?.originalname}": ${(error as Error).message}`,
        );
        result.failed.push({
          fileName: file?.originalname ?? 'unknown',
          error: (error as Error).message,
        });
        result.totalFailed++;
      }
    }

    // If nothing uploaded and everything failed, surface it as a 400 so the
    // admin sees an error toast rather than an empty success.
    if (result.totalUploaded === 0) {
      throw new BadRequestException(
        result.failed[0]?.error ?? 'All image uploads failed',
      );
    }

    return result;
  }

  /**
   * Delete an image by its stored URL, best-effort.
   *
   * Dispatches on the URL, NOT on the active provider: a store that has
   * switched to R2 still holds plenty of Cloudinary URLs, and routing those to
   * R2 would delete nothing while reporting success.
   */
  async deleteByUrl(url: string): Promise<{ success: boolean }> {
    if (/res\.cloudinary\.com/i.test(url)) {
      const publicId = this.cloudinary.extractPublicId(url);
      if (!publicId) {
        throw new BadRequestException(
          'Could not derive a public id from the Cloudinary URL',
        );
      }
      await this.cloudinary.delete(publicId);
      return { success: true };
    }

    const key = await this.r2.extractKey(url);
    if (key) {
      await this.r2.delete(key);
      return { success: true };
    }

    throw new BadRequestException(
      'URL does not belong to Cloudinary or the configured R2 bucket',
    );
  }

  /**
   * Per-provider storage usage for the Settings → Media panel.
   *
   * Figures come from the providers themselves — Cloudinary's usage API and a
   * listing of the R2 bucket. The reference derives these from its `media`
   * table, which Jakalburg doesn't have (and which would only ever count files
   * uploaded through the admin anyway).
   *
   * Either provider failing is reported in its own slice; it never fails the
   * request, so one broken credential doesn't blank the whole panel.
   */
  async getStorageUsage(): Promise<{
    provider: 'cloudinary' | 'r2';
    cloudinary: ProviderUsage;
    r2: ProviderUsage;
  }> {
    const config = await this.storageSettings.resolve();

    const [cloudinaryUsage, r2Usage] = await Promise.all([
      this.cloudinaryUsage(),
      this.r2Usage(),
    ]);

    return {
      provider: config.provider,
      cloudinary: cloudinaryUsage,
      r2: r2Usage,
    };
  }

  private async cloudinaryUsage(): Promise<ProviderUsage> {
    const { cloudinary: config } = await this.storageSettings.resolve();
    const manualLimit = config.storageLimitBytes;

    if (!config.configured) {
      return this.emptyUsage(
        'cloudinary',
        manualLimit,
        'Add Cloudinary credentials to see usage.',
      );
    }

    try {
      const { usedBytes, limitBytes, fileCount } =
        await this.cloudinary.usage();
      // Cloudinary's own quota wins; the manual limit is the fallback.
      const limit = limitBytes ?? manualLimit;
      return {
        provider: 'cloudinary',
        configured: true,
        usedBytes,
        usedHuman: this.formatBytes(usedBytes),
        limitBytes: limit,
        limitHuman: limit ? this.formatBytes(limit) : 'Set a manual limit',
        percentUsed:
          limit && usedBytes !== null ? (usedBytes / limit) * 100 : null,
        fileCount,
        note:
          limitBytes !== null
            ? 'Reported by your Cloudinary account.'
            : 'Reported by Cloudinary; quota is your manual limit.',
      };
    } catch (error) {
      return {
        ...this.emptyUsage('cloudinary', manualLimit, 'Could not read usage.'),
        configured: true,
        error: (error as Error).message,
      };
    }
  }

  private async r2Usage(): Promise<ProviderUsage> {
    const { r2: config } = await this.storageSettings.resolve();
    const manualLimit = config.storageLimitBytes;

    if (!config.configured) {
      return this.emptyUsage(
        'r2',
        manualLimit,
        'Add R2 credentials to see usage.',
      );
    }

    try {
      const { usedBytes, fileCount, truncated } = await this.r2.usage();
      return {
        provider: 'r2',
        configured: true,
        usedBytes,
        usedHuman: this.formatBytes(usedBytes),
        limitBytes: manualLimit,
        limitHuman: manualLimit
          ? this.formatBytes(manualLimit)
          : 'Set a manual limit',
        percentUsed: manualLimit ? (usedBytes / manualLimit) * 100 : null,
        fileCount,
        note: truncated
          ? 'Bucket is large — figures cover the first 10,000 objects.'
          : 'Measured from the R2 bucket. R2 has no hard quota.',
      };
    } catch (error) {
      return {
        ...this.emptyUsage('r2', manualLimit, 'Could not read the bucket.'),
        configured: true,
        error: (error as Error).message,
      };
    }
  }

  private emptyUsage(
    provider: 'cloudinary' | 'r2',
    limitBytes: number | null,
    note: string,
  ): ProviderUsage {
    return {
      provider,
      configured: false,
      usedBytes: null,
      usedHuman: '0 B',
      limitBytes,
      limitHuman: limitBytes ? this.formatBytes(limitBytes) : 'Not set',
      percentUsed: null,
      fileCount: null,
      note,
    };
  }

  private formatBytes(bytes: number | null): string {
    if (bytes === null || Number.isNaN(bytes)) return '—';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit++;
    }
    return `${value.toFixed(value >= 100 ? 0 : 2)} ${units[unit]}`;
  }

  /** Verify the ACTIVE provider, for the admin's Verify button. */
  async verifyActiveProvider(): Promise<{
    success: boolean;
    message: string;
    provider: 'cloudinary' | 'r2';
  }> {
    const { provider } = await this.storageSettings.resolve();

    try {
      if (provider === 'r2') {
        await this.r2.ping();
        return { success: true, message: 'R2 bucket reachable.', provider };
      }
      await this.cloudinary.ping();
      return { success: true, message: 'Cloudinary reachable.', provider };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
        provider,
      };
    }
  }

  private validateImage(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Empty file');
    }
    const maxBytes = env.UPLOAD_IMAGE_MAX_SIZE * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(
        `Image exceeds the ${env.UPLOAD_IMAGE_MAX_SIZE}MB limit`,
      );
    }
    // Some browsers/OSes send an empty or generic mimetype for these, so fall
    // back to the extension before rejecting.
    const isByExtension = /\.(heic|heif|ico)$/i.test(file.originalname || '');
    if (!this.imageMimeTypes.includes(file.mimetype) && !isByExtension) {
      throw new BadRequestException(
        `Unsupported image type "${file.mimetype}". Allowed: ${this.imageMimeTypes.join(', ')}`,
      );
    }
  }
}
