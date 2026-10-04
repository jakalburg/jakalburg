import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RedisService } from './redis.service';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * RedisController — cache operations behind the admin's Settings → Media
 * screen. The credentials themselves live on StorageSettings and are written
 * through PATCH /settings/storage; these are the read-only / operational
 * routes.
 *
 * EVERY route is @AdminOnly(). Each one spends Upstash commands, so the admin
 * UI calls them on demand (a Refresh button) rather than on a timer — see the
 * note on `stats`.
 */
@ApiTags('Settings')
@Controller('settings/redis')
export class RedisController {
  constructor(private readonly redis: RedisService) {}

  /**
   * Admin: cache statistics.
   *
   * The reference polls its equivalent every 5 seconds and the key list every
   * 10. Upstash's free plan allows 10,000 commands per DAY, and describing a
   * key costs two commands on top of the scan — so that polling drains a day's
   * budget in minutes. On-demand only here.
   */
  @Get('stats')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: Redis cache statistics' })
  @ApiOkResponse({ description: 'Enabled/reachable flags, key count, usage.' })
  stats() {
    return this.redis.getStats();
  }

  /** Admin: the cached keys with type and TTL, capped at 50. */
  @Get('keys')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: list cached keys' })
  @ApiOkResponse({ description: '{ keys, truncated }.' })
  keys() {
    return this.redis.listKeys();
  }

  /** Admin: ping the configured Redis, even while caching is toggled off. */
  @Post('verify')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: verify the Redis connection' })
  @ApiOkResponse({ description: '{ success, message }.' })
  verify() {
    return this.redis.verify();
  }

  /** Admin: drop every cached key. */
  @Post('flush')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: flush the whole cache' })
  @ApiOkResponse({ description: '{ success, message }.' })
  flush() {
    return this.redis.flush();
  }
}
