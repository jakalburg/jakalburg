import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { env } from '../config/env';
import { ImageUploadResponseDto } from './dto/upload-response.dto';

/**
 * UploadService
 *
 * Validates incoming image files and pushes them to Cloudinary. A lean
 * equivalent of the kaybykhushie reference: Cloudinary-only (no R2), and no DB
 * Media record — the returned URLs are stored directly on Product.images[] by
 * the admin. Folder is fixed to "products".
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
  ];

  constructor(private readonly cloudinary: CloudinaryService) {}

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
        const { url, publicId } = await this.cloudinary.upload(
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

  /** Delete an image from Cloudinary by its stored URL. Best-effort. */
  async deleteByUrl(url: string): Promise<{ success: boolean }> {
    const publicId = this.cloudinary.extractPublicId(url);
    if (!publicId) {
      throw new BadRequestException('Could not derive a public id from the URL');
    }
    await this.cloudinary.delete(publicId);
    return { success: true };
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
    const isHeicExt = /\.(heic|heif)$/i.test(file.originalname || '');
    if (!this.imageMimeTypes.includes(file.mimetype) && !isHeicExt) {
      throw new BadRequestException(
        `Unsupported image type "${file.mimetype}". Allowed: ${this.imageMimeTypes.join(', ')}`,
      );
    }
  }
}
