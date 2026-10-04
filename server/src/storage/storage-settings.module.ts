import { Module } from '@nestjs/common';
import { StorageSettingsService } from './storage-settings.service';

/**
 * Holds the StorageSettings singleton on its own so that both StorageModule
 * (uploads) and RedisModule (cache) can read the same config without importing
 * each other — the credentials for all three backends live on one row.
 */
@Module({
  providers: [StorageSettingsService],
  exports: [StorageSettingsService],
})
export class StorageSettingsModule {}
