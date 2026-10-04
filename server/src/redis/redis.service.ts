import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { StorageSettingsService } from '../storage/storage-settings.service';

/** Cap on how many keys the admin key-viewer will ever enumerate. Each key
 *  costs two further commands (TYPE + TTL) to describe, and the Upstash free
 *  plan allows 10,000 commands per DAY — an uncapped listing of a warm cache
 *  could spend a meaningful slice of that in a single click. */
const KEY_VIEWER_LIMIT = 50;

/** Upstash's free plan quota, used only to render a "budget used" figure in
 *  the admin. Not enforced here — Upstash enforces it. */
export const UPSTASH_FREE_DAILY_COMMANDS = 10_000;

export interface RedisKeyInfo {
  key: string;
  type: string;
  /** Seconds remaining; -1 = no expiry, -2 = missing. */
  ttl: number;
}

/**
 * RedisService — optional read-through cache backed by Upstash REST.
 *
 * EVERY method fails open. If Redis is disabled, unconfigured, unreachable or
 * over quota, reads return null/empty and writes are dropped, so callers fall
 * through to Postgres and the store behaves exactly as it does with caching
 * off. That is the default state: `redisEnabled` starts false and there is no
 * env fallback, so nothing here is live until credentials are pasted into
 * Settings → Media.
 *
 * Diverges from the kaybykhushie reference in three ways, all for the free
 * plan's 10,000-commands-per-day budget:
 *   - the key viewer SCANs with a cap instead of `KEYS *`
 *   - TYPE/TTL lookups are pipelined into one round trip
 *   - commands issued are counted so the admin can see the burn rate
 */
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  private client: Redis | null = null;
  /** Identity of the config the current client was built from. */
  private clientKey = '';
  /** Commands issued since boot — surfaced in the admin stats panel. */
  private commandCount = 0;
  /** Logged once per outage so a dead cache can't flood the logs. */
  private warnedUnreachable = false;

  constructor(private readonly storageSettings: StorageSettingsService) {}

  /**
   * The Upstash client, or null when caching is off. Rebuilt only when the
   * URL or token actually changes, so an admin save takes effect immediately
   * without a restart.
   */
  private async getClient(): Promise<Redis | null> {
    const { redis } = await this.storageSettings.resolve();

    if (!redis.usable) {
      this.client = null;
      this.clientKey = '';
      return null;
    }

    const key = `${redis.url}:${redis.token}`;
    if (this.client && key === this.clientKey) return this.client;

    try {
      this.client = new Redis({ url: redis.url, token: redis.token });
      this.clientKey = key;
      this.warnedUnreachable = false;
      this.logger.log('Redis cache enabled (Upstash REST).');
      return this.client;
    } catch (error) {
      this.logger.warn(
        `Failed to build Redis client: ${this.reason(error)}. Caching stays off.`,
      );
      this.client = null;
      this.clientKey = '';
      return null;
    }
  }

  private reason(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }

  /** Log the first failure after a healthy period, then stay quiet. */
  private noteFailure(context: string, error: unknown): void {
    if (this.warnedUnreachable) return;
    this.warnedUnreachable = true;
    this.logger.warn(
      `Redis ${context} failed: ${this.reason(error)}. Falling back to the database.`,
    );
  }

  /** True when caching is live. Cheap — no network call. */
  async isEnabled(): Promise<boolean> {
    return (await this.getClient()) !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    if (!client) return null;
    try {
      this.commandCount++;
      return await client.get<T>(key);
    } catch (error) {
      this.noteFailure(`GET ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      this.commandCount++;
      await client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      this.noteFailure(`SET ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    const client = await this.getClient();
    if (!client) return;
    try {
      this.commandCount++;
      await client.del(key);
    } catch (error) {
      this.noteFailure(`DEL ${key}`, error);
    }
  }

  /**
   * Read-through helper: return the cached value, or run `loader`, cache its
   * result and return that. The ONLY method callers should normally need.
   *
   * A loader failure propagates — a broken query must not be hidden by the
   * cache. A cache failure does not: the loader still runs.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;

    const fresh = await loader();
    // Never cache an empty result — a miss is cheap, a wrongly-cached empty
    // list is a bug that outlives the request that caused it. An empty ARRAY
    // counts: it is neither null nor undefined, so it used to sail through and
    // get stored. On `website:sections`, whose TTL is an hour, that is the
    // difference between a blank home page for one request and a blank home
    // page until the TTL lapses.
    const isEmpty =
      fresh === null ||
      fresh === undefined ||
      (Array.isArray(fresh) && fresh.length === 0);
    if (!isEmpty) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  /**
   * Delete every key matching a glob, e.g. `products:*`. Used for
   * invalidation after an admin write, which is rare enough that the SCAN
   * cost doesn't matter.
   */
  async delPattern(pattern: string): Promise<number> {
    const client = await this.getClient();
    if (!client) return 0;

    try {
      const keys = await this.scanKeys(client, pattern, Number.MAX_SAFE_INTEGER);
      if (keys.length === 0) return 0;
      this.commandCount++;
      await client.del(...keys);
      return keys.length;
    } catch (error) {
      this.noteFailure(`DEL pattern ${pattern}`, error);
      return 0;
    }
  }

  /** Invalidate several patterns at once. Failures are swallowed per pattern. */
  async invalidate(...patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.delPattern(pattern);
    }
  }

  /**
   * Cursor-paginated SCAN, stopping at `limit`. Replaces the reference's
   * `KEYS *`, which is a single blocking command over the whole keyspace.
   */
  private async scanKeys(
    client: Redis,
    pattern: string,
    limit: number,
  ): Promise<string[]> {
    const found: string[] = [];
    let cursor = '0';

    do {
      this.commandCount++;
      const [next, batch] = await client.scan(cursor, {
        match: pattern,
        count: 100,
      });
      found.push(...batch);
      cursor = String(next);
    } while (cursor !== '0' && found.length < limit);

    return found.slice(0, limit);
  }

  /**
   * Cache statistics for the admin panel. Upstash's REST API has no INFO, so
   * memory figures aren't available — `dbsize` and the local command counter
   * are what we can honestly report.
   */
  async getStats(): Promise<{
    enabled: boolean;
    reachable: boolean;
    dbSize: number;
    commandsThisUptime: number;
    freeDailyCommandBudget: number;
    message?: string;
  }> {
    const config = (await this.storageSettings.resolve()).redis;
    const base = {
      enabled: config.enabled,
      reachable: false,
      dbSize: 0,
      commandsThisUptime: this.commandCount,
      freeDailyCommandBudget: UPSTASH_FREE_DAILY_COMMANDS,
    };

    const client = await this.getClient();
    if (!client) {
      return {
        ...base,
        message: config.enabled
          ? 'Caching is on but no Redis URL and token are saved yet.'
          : 'Caching is off.',
      };
    }

    try {
      this.commandCount++;
      const dbSize = await client.dbsize();
      return {
        ...base,
        reachable: true,
        dbSize: dbSize ?? 0,
        commandsThisUptime: this.commandCount,
      };
    } catch (error) {
      return { ...base, message: this.reason(error) };
    }
  }

  /**
   * The cached keys, capped, with their type and TTL. The two lookups per key
   * are pipelined into ONE HTTP round trip — the reference issues 2N separate
   * requests, which on a warm cache is both slow and quota-expensive.
   */
  async listKeys(): Promise<{ keys: RedisKeyInfo[]; truncated: boolean }> {
    const client = await this.getClient();
    if (!client) return { keys: [], truncated: false };

    try {
      // Fetch one extra to detect truncation without a second scan.
      const scanned = await this.scanKeys(client, '*', KEY_VIEWER_LIMIT + 1);
      const truncated = scanned.length > KEY_VIEWER_LIMIT;
      const keys = scanned.slice(0, KEY_VIEWER_LIMIT);
      if (keys.length === 0) return { keys: [], truncated: false };

      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.type(key);
        pipeline.ttl(key);
      }
      this.commandCount += keys.length * 2;
      const results = (await pipeline.exec()) as unknown[];

      return {
        keys: keys.map((key, i) => ({
          key,
          type: String(results[i * 2] ?? 'unknown'),
          ttl: Number(results[i * 2 + 1] ?? -2),
        })),
        truncated,
      };
    } catch (error) {
      this.noteFailure('key listing', error);
      return { keys: [], truncated: false };
    }
  }

  /** Ping, for the admin's Verify button. Never throws. */
  async verify(): Promise<{ success: boolean; message: string }> {
    const config = (await this.storageSettings.resolve()).redis;

    if (!config.url || !config.token) {
      return {
        success: false,
        message: 'Redis is not configured — a REST URL and token are required.',
      };
    }

    try {
      // Built directly rather than via getClient() so Verify still works while
      // caching is toggled off — that is exactly when you want to test it.
      const client = new Redis({ url: config.url, token: config.token });
      this.commandCount++;
      const pong = await client.ping();
      return pong === 'PONG'
        ? { success: true, message: `Connected to ${config.url}.` }
        : { success: false, message: `Redis replied: ${String(pong)}` };
    } catch (error) {
      return { success: false, message: this.reason(error) };
    }
  }

  /** Drop every key. Backs the admin's "Flush Global Cache" button. */
  async flush(): Promise<{ success: boolean; message: string }> {
    const client = await this.getClient();
    if (!client) {
      return {
        success: false,
        message: 'Caching is not active, so there is nothing to flush.',
      };
    }

    try {
      this.commandCount++;
      await client.flushdb();
      return { success: true, message: 'Cache cleared.' };
    } catch (error) {
      return { success: false, message: this.reason(error) };
    }
  }
}
