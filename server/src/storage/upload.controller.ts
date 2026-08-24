import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { ImageUploadResponseDto } from './dto/upload-response.dto';
import { env } from '../config/env';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/** Max images accepted in a single request — mirrors the admin form's cap. */
export const MAX_IMAGES_PER_UPLOAD = 10;

/**
 * UploadController — media uploads for the admin catalogue.
 *
 * Route (behind the global `/api` prefix): POST /api/uploads/images
 *
 * NOTE: unguarded for now, matching the product write routes so the admin UI
 * (mock auth session) can call it. Add JwtAuthGuard + RolesGuard('admin')
 * before any non-local deployment.
 *
 * GUARDED: class-level @AdminOnly() — the storefront never uploads; admin-only.
 */
@ApiTags('Uploads')
@AdminOnly()
@Controller('uploads')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  /** Upload up to 10 images; returns their Cloudinary URLs. */
  @Post('images')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: upload up to 10 product images to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ImageUploadResponseDto })
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES_PER_UPLOAD, {
      storage: memoryStorage(),
      limits: {
        files: MAX_IMAGES_PER_UPLOAD,
        fileSize: env.UPLOAD_IMAGE_MAX_SIZE * 1024 * 1024,
      },
    }),
  )
  uploadImages(
    @UploadedFiles() images: Express.Multer.File[],
  ): Promise<ImageUploadResponseDto> {
    if (!images || images.length === 0) {
      throw new BadRequestException('No images provided (field name: "images")');
    }
    return this.upload.uploadImages(images);
  }

  /** Delete a previously uploaded image from Cloudinary by its URL. */
  @Delete('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: delete an uploaded image by URL' })
  deleteImage(@Query('url') url?: string): Promise<{ success: boolean }> {
    if (!url) {
      throw new BadRequestException('url query parameter is required');
    }
    return this.upload.deleteByUrl(url);
  }
}
