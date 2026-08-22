import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

/**
 * StorageModule — Cloudinary-backed media uploads for the admin catalogue.
 *
 * Lean version of the kaybykhushie reference: Cloudinary only (no R2), creds
 * from env (no DB Settings row), and no Media table (URLs are stored directly
 * on Product.images[]).
 */
@Module({
  providers: [CloudinaryService, UploadService],
  controllers: [UploadController],
  exports: [CloudinaryService, UploadService],
})
export class StorageModule {}
