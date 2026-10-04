import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { R2Service } from './r2.service';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { StorageSettingsController } from './storage-settings.controller';
import { StorageSettingsModule } from './storage-settings.module';

/**
 * StorageModule — media uploads for the admin catalogue.
 *
 * Two interchangeable backends, Cloudinary and Cloudflare R2, selected by the
 * `storageProvider` field on the StorageSettings singleton (Settings → Media).
 * Credentials live on that row rather than in env, so they can be changed
 * without a redeploy; CLOUDINARY_* still seeds the row on first read.
 *
 * There is no Media table — upload URLs are stored directly on Product.images[]
 * by the admin, so storage usage is read from the providers themselves.
 */
@Module({
  imports: [StorageSettingsModule],
  providers: [CloudinaryService, R2Service, UploadService],
  controllers: [UploadController, StorageSettingsController],
  exports: [CloudinaryService, R2Service, UploadService],
})
export class StorageModule {}
