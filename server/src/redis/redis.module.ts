import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisController } from './redis.controller';
import { StorageSettingsModule } from '../storage/storage-settings.module';

/**
 * RedisModule — the optional read-through cache.
 *
 * @Global because caching cuts across most read paths; services inject
 * RedisService without each module having to import this one.
 *
 * Nothing connects at boot. The client is built lazily on first use and only
 * when credentials have been saved in Settings → Media, so a deployment with
 * no Redis configured behaves exactly as it did before this module existed.
 */
@Global()
@Module({
  imports: [StorageSettingsModule],
  controllers: [RedisController],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
