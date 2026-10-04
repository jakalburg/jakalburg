import { Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_NS, CACHE_TTL } from '../redis/cache-keys';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { DEFAULT_SETTINGS } from './settings.defaults';

const CACHE_KEY = `${CACHE_NS.settings}public`;

/**
 * SettingsService — persistence for the global store identity behind the
 * admin's Settings → Store screen.
 *
 * Singleton: one row, created on first read (same shape as the About and
 * Contact page content in WebsiteService). Reads are public — the storefront
 * header, footer, SEO tags and /contact page all pull from here — so nothing
 * secret may ever live on this model.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * The settings row, creating and seeding it on first access.
   *
   * Cached: the storefront header, footer and SEO tags all read this, so it is
   * the single most-requested row in the database. Falls through to Postgres
   * whenever caching is off or unreachable.
   */
  async get(): Promise<Settings> {
    return this.redis.getOrSet(CACHE_KEY, CACHE_TTL.settings, () =>
      this.load(),
    );
  }

  private async load(): Promise<Settings> {
    const existing = await this.prisma.settings.findFirst();
    if (existing) return existing;

    return this.prisma.settings.create({
      data: { ...DEFAULT_SETTINGS, ...(await this.inheritedContactDetails()) },
    });
  }

  /** Admin: patch the settings, creating the row first if it doesn't exist. */
  async update(dto: UpdateSettingsDto): Promise<Settings> {
    const current = await this.load(); // ensures the row exists, uncached
    const updated = await this.prisma.settings.update({
      where: { id: current.id },
      data: dto,
    });
    await this.redis.del(CACHE_KEY);
    return updated;
  }

  /**
   * Contact details used to live on WebsiteContact. When we create the
   * Settings row for the first time on a store that predates this model, carry
   * those four values across so the storefront doesn't lose them.
   *
   * Only non-empty values are inherited, and this runs exactly once (on
   * create), so later edits in either place never fight each other.
   */
  private async inheritedContactDetails(): Promise<
    Pick<UpdateSettingsDto, 'email' | 'phone' | 'address' | 'mapLink'>
  > {
    const legacy = await this.prisma.websiteContact.findFirst();
    if (!legacy) return {};

    const carried: Record<string, string> = {};
    for (const key of ['email', 'phone', 'address', 'mapLink'] as const) {
      const value = legacy[key]?.trim();
      if (value) carried[key] = value;
    }
    return carried;
  }
}
