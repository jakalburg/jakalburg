import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HomeSection,
  Prisma,
  WebsiteAbout,
  WebsiteContact,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_NS, CACHE_TTL } from '../redis/cache-keys';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { UpdateWebsiteContactDto } from './dto/update-website-contact.dto';
import { UpdateWebsiteAboutDto } from './dto/update-website-about.dto';
import {
  DEFAULT_HOME_SECTIONS,
  DEFAULT_HOME_SECTION_TYPES,
} from './home-sections.defaults';

/** Seeded once, the first time anyone reads the Contact page content. */
const DEFAULT_CONTACT: Prisma.WebsiteContactCreateInput = {
  title: "We're here to help.",
  formDescription:
    'Questions about a piece, an order, or fit? Our care team responds within one business day.',
};

/** Seeded once, the first time anyone reads the About page content. */
const DEFAULT_ABOUT: Prisma.WebsiteAboutCreateInput = {
  subtitle: 'Our story',
  title: 'A small studio, patient work.',
  description: [
    'Jakalburg is a considered ready-to-wear label. We work with a small palette of natural fibres — long-staple cottons, European linens, fine merino and Japanese denim — and cut them into a wardrobe that stays close for years.',
    'Every piece is designed in a small studio and produced in limited runs. We keep our range tight so that we can keep our care high, and price honestly so that the value stays with the garment, not the marketing.',
    "We believe the best clothes are ones you barely think about — the piece you reach for again and again because it works. That's the wardrobe we're building.",
  ].join('\n\n'),
};

/**
 * WebsiteService — persistence for the editable home-page sections behind the
 * admin's Website → Home Setup tab, plus the storefront's public hero read.
 *
 * NOTE: the admin write routes (update / seed) are UNGUARDED for now, matching
 * the product / fabric / customer / order-admin write routes (the admin uses a
 * mock auth session, realApi sends no JWT). Add JwtAuthGuard + RolesGuard('admin')
 * before any non-local deployment.
 */
@Injectable()
export class WebsiteService {
  /** In-flight/completed canonical sync, so it runs once per process. */
  private canonicalSync?: Promise<unknown>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Bring the stored sections in line with the canonical list before serving
   * them — once per process.
   *
   * The storefront renders itself FROM these rows, so a database that predates
   * a change to DEFAULT_HOME_SECTIONS serves a half-empty home page: the new
   * section types simply aren't there, and the client can't tell "never
   * seeded" from "the admin switched it off". Repairing on read rather than
   * waiting for someone to press Sync is the same create-on-first-read
   * contract `getContact` and `getAbout` already have.
   *
   * Memoised on the promise: concurrent first requests share one sync, later
   * requests pay nothing. A failure clears the memo so the next read retries.
   */
  private ensureCanonicalSections(): Promise<unknown> {
    if (!this.canonicalSync) {
      this.canonicalSync = this.syncToCanonical().catch((error) => {
        this.canonicalSync = undefined;
        throw error;
      });
    }
    return this.canonicalSync;
  }

  /**
   * Every section (incl. disabled), ordered — the admin table's shape.
   * Deliberately UNCACHED: this is the admin's own view, and an editor who
   * can't see their save land immediately will assume it failed.
   */
  async findAllSections(): Promise<HomeSection[]> {
    await this.ensureCanonicalSections();
    return this.prisma.homeSection.findMany({ orderBy: { order: 'asc' } });
  }

  /**
   * The enabled hero slider config for the storefront: its slides plus the
   * `fullBleed` flag (true → edge-to-edge photo carousel; false → split
   * text+image layout). `slides` is empty when the section is missing, disabled,
   * or has none, so the client can cleanly fall back to its static hero.
   */
  async getHeroConfig(): Promise<{ fullBleed: boolean; slides: any[] }> {
    return this.redis.getOrSet(
      `${CACHE_NS.website}hero`,
      CACHE_TTL.website,
      async () => {
        const hero = await this.prisma.homeSection.findUnique({
          where: { type: 'HeroSlider' },
        });
        const slides =
          hero && hero.enabled && Array.isArray(hero.data)
            ? (hero.data as any[])
            : [];
        return { fullBleed: !!hero?.fullBleed, slides };
      },
    );
  }

  /**
   * Every ENABLED section, ordered — the storefront's whole home page in one
   * read, plus the Footer row (whose `data` holds the site-wide footer
   * background). The client renders one block per row, so a section the admin
   * disables simply stops being returned.
   *
   * Cached like the other public reads; `updateSection` busts it.
   */
  async getPublicSections(): Promise<HomeSection[]> {
    // Sync BEFORE the cache read, not inside the factory: a stale entry
    // written before the canonical list changed would otherwise be served for
    // the rest of its hour-long TTL without the factory ever running. The
    // sync's own cache bust is what clears it.
    await this.ensureCanonicalSections();
    return this.redis.getOrSet(
      `${CACHE_NS.website}sections`,
      CACHE_TTL.website,
      () =>
        this.prisma.homeSection.findMany({
          where: { enabled: true },
          orderBy: { order: 'asc' },
        }),
    );
  }

  /** Patch one or a few fields of a section (inline edits, toggles, `data`). */
  async updateSection(
    id: string,
    dto: UpdateHomeSectionDto,
  ): Promise<HomeSection> {
    const existing = await this.prisma.homeSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Home section "${id}" not found`);

    const data: Prisma.HomeSectionUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.eyebrow !== undefined) data.eyebrow = dto.eyebrow;
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.gridBg !== undefined) data.gridBg = dto.gridBg;
    if (dto.paddingTop !== undefined) data.paddingTop = dto.paddingTop;
    if (dto.paddingBottom !== undefined) data.paddingBottom = dto.paddingBottom;
    if (dto.fullBleed !== undefined) data.fullBleed = dto.fullBleed;
    if (dto.data !== undefined) data.data = dto.data ?? Prisma.JsonNull;

    const updated = await this.prisma.homeSection.update({ where: { id }, data });
    await this.bustSectionCaches();
    return updated;
  }

  /** Both public section reads are derived from the same rows. */
  private async bustSectionCaches(): Promise<void> {
    await this.redis.del(`${CACHE_NS.website}hero`);
    await this.redis.del(`${CACHE_NS.website}sections`);
  }

  /**
   * The storefront Contact page content (public). It's a singleton row — created
   * with sensible defaults on first read, so the admin/storefront never see null.
   */
  async getContact(): Promise<WebsiteContact> {
    return this.redis.getOrSet(
      `${CACHE_NS.website}contact`,
      CACHE_TTL.website,
      () => this.loadContact(),
    );
  }

  private async loadContact(): Promise<WebsiteContact> {
    const existing = await this.prisma.websiteContact.findFirst();
    if (existing) return existing;
    return this.prisma.websiteContact.create({ data: DEFAULT_CONTACT });
  }

  /** Admin: patch the Contact page content (upserts the singleton). */
  async updateContact(
    dto: UpdateWebsiteContactDto,
  ): Promise<WebsiteContact> {
    const current = await this.loadContact(); // ensures the row exists, uncached
    const updated = await this.prisma.websiteContact.update({
      where: { id: current.id },
      data: dto,
    });
    await this.redis.del(`${CACHE_NS.website}contact`);
    return updated;
  }

  /** Public: the About page content, creating the singleton on first read. */
  async getAbout(): Promise<WebsiteAbout> {
    return this.redis.getOrSet(
      `${CACHE_NS.website}about`,
      CACHE_TTL.website,
      () => this.loadAbout(),
    );
  }

  private async loadAbout(): Promise<WebsiteAbout> {
    const existing = await this.prisma.websiteAbout.findFirst();
    if (existing) return existing;
    return this.prisma.websiteAbout.create({ data: DEFAULT_ABOUT });
  }

  /** Admin: patch the About page content (upserts the singleton). */
  async updateAbout(dto: UpdateWebsiteAboutDto): Promise<WebsiteAbout> {
    const current = await this.loadAbout(); // ensures the row exists, uncached
    const updated = await this.prisma.websiteAbout.update({
      where: { id: current.id },
      data: dto,
    });
    await this.redis.del(`${CACHE_NS.website}about`);
    return updated;
  }

  /**
   * Sync the stored sections to the canonical list: create any that are
   * missing, and DELETE any whose type the storefront no longer renders.
   *
   * The prune is the point, not a side effect. Rows left over from the
   * inherited kaybykhushie list (AnimatedBanner, GiftWrapping, Reviews, …) show
   * up in the admin as toggleable sections that cannot affect the site, which
   * is worse than not offering them. Existing rows whose type IS canonical are
   * never touched — an admin's own edits survive.
   */
  async seedDefaults(): Promise<{
    seeded: number;
    removed: number;
    total: number;
  }> {
    const result = await this.syncToCanonical();
    // The store is now in sync; don't let a later read redo the work.
    this.canonicalSync = Promise.resolve();
    return result;
  }

  /** The sync itself. See `seedDefaults` for what it guarantees. */
  private async syncToCanonical(): Promise<{
    seeded: number;
    removed: number;
    total: number;
  }> {
    // One read of the existing types rather than a findUnique per canonical
    // section — this runs on the first request of every process, so the
    // steady-state cost is what matters.
    const existing = await this.prisma.homeSection.findMany({
      select: { type: true },
    });
    const existingTypes = new Set(existing.map((row) => row.type));

    const missing = DEFAULT_HOME_SECTIONS.filter(
      (section) => !existingTypes.has(section.type),
    );
    for (const section of missing) {
      await this.prisma.homeSection.create({ data: section });
    }
    const seeded = missing.length;

    const stale = [...existingTypes].filter(
      (type) => !DEFAULT_HOME_SECTION_TYPES.includes(type),
    );
    const { count: removed } = stale.length
      ? await this.prisma.homeSection.deleteMany({
          where: { type: { in: stale } },
        })
      : { count: 0 };

    // Close the gaps the prune leaves behind. Sorting is unaffected either way,
    // but the admin prints the raw `order` next to each row, and 1,2,3,4,5,9
    // reads like something went wrong. Relative order is preserved.
    if (removed > 0) {
      const remaining = await this.prisma.homeSection.findMany({
        orderBy: { order: 'asc' },
        select: { id: true },
      });
      await this.prisma.$transaction(
        remaining.map((section, index) =>
          this.prisma.homeSection.update({
            where: { id: section.id },
            data: { order: index + 1 },
          }),
        ),
      );
    }

    // Only pay for the invalidation when something actually moved. In the
    // steady state this method is a no-op that runs once per process, and
    // Upstash's free tier is budgeted per command.
    if (seeded > 0 || removed > 0) {
      await this.bustSectionCaches();
    }

    const total = existingTypes.size + seeded - removed;
    return { seeded, removed, total };
  }
}
