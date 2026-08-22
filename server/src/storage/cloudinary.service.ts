import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';

/**
 * CloudinaryService
 *
 * Thin wrapper over the Cloudinary SDK. Configured once from environment
 * credentials at module init (Jakalburg keeps creds in server/.env — unlike
 * the kaybykhushie reference, which pulls them from a DB Settings row and also
 * supports R2). Uploads image buffers and returns the secure delivery URL.
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  onModuleInit(): void {
    if (env.isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.configured = true;
      this.logger.log(
        `Cloudinary configured for cloud: ${env.CLOUDINARY_CLOUD_NAME}`,
      );
    } else {
      this.logger.warn(
        'Cloudinary credentials missing — image uploads will fail until ' +
          'CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are set in server/.env.',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a file buffer to Cloudinary and return its secure URL + public id.
   * Applies f_auto,q_auto delivery so browsers that can't render the source
   * format (e.g. iPhone HEIC) still get a compatible image.
   */
  async upload(
    buffer: Buffer,
    folder: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!this.configured) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_* in server/.env.',
      );
    }

    const resourceType = mimeType.startsWith('video/') ? 'video' : 'image';
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^\w-]+/g, '-');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `jakalburg/${folder}`,
          resource_type: resourceType,
          public_id: `${Date.now()}-${baseName}`,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload failed: ${error?.message ?? 'no result'}`,
            );
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
    if (!this.configured) {
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
