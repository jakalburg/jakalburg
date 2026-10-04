import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Category, Gender, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_NS, CACHE_TTL } from '../redis/cache-keys';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

/** A category plus how many products currently reference its slug. */
export interface CategoryWithUsage extends Category {
  productCount: number;
}

export interface CategoryListQuery extends PaginationQuery {
  /** Free text over name and slug. */
  search?: string;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ------------------------------------------------------------ derivation

  /**
   * Category slugs that products actually use.
   *
   * This is the pre-existing source of truth and still the only thing that
   * proves a category has something to show. `gender` narrows to live products
   * of that gender, matching how `listForNav` filters, so the nav can never
   * link to a listing page that comes back empty.
   */
  async listInUse(gender?: Gender): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
      where: {
        category: { not: '' },
        ...(gender ? { gender, isActive: true } : {}),
      },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
  }

  /**
   * What the storefront nav lists for a gender.
   *
   * An INTERSECTION, never a union: a category appears only if it has live
   * products for that gender AND — if it has a row in this table — that row is
   * active and either declares this gender or declares none. So the table can
   * hide a category or pin its order, but it can never conjure one into the
   * nav that has nothing to sell. Categories with no row at all pass straight
   * through, which is what keeps the storefront working before anyone has
   * opened the Categories screen.
   */
  async listForNav(gender: Gender): Promise<string[]> {
    return this.redis.getOrSet(
      `${CACHE_NS.categories}nav:${gender}`,
      CACHE_TTL.categories,
      async () => {
        const inUse = await this.listInUse(gender);
        if (inUse.length === 0) return [];

        // Fails OPEN to the derived list. This feeds the storefront's menu, so
        // an unreadable Category table (not yet migrated, or a blip) must not
        // empty the navigation — the curation layer going missing should cost
        // ordering and hiding, not the whole menu.
        const rows = await this.safeFindBySlugs(inUse);
        if (rows === null) return inUse;

        const bySlug = new Map(rows.map((r) => [r.slug, r]));

        const allowed = inUse.filter((slug) => {
          const row = bySlug.get(slug);
          if (!row) return true; // unmanaged — derivation alone decides
          if (!row.isActive) return false;
          return row.genders.length === 0 || row.genders.includes(gender);
        });

        // Managed rows lead, in their configured order; unmanaged ones follow
        // alphabetically so a half-curated catalogue still reads sensibly.
        const managed = rows
          .filter((r) => allowed.includes(r.slug))
          .map((r) => r.slug);
        const unmanaged = allowed
          .filter((slug) => !bySlug.has(slug))
          .sort();
        return [...managed, ...unmanaged];
      },
    );
  }

  /**
   * What the admin's product-form dropdown offers: every managed category
   * merged with everything already in use.
   *
   * The union (not the intersection) is the point here. The product form still
   * lets an admin type a category freely, so a slug can exist on products
   * without a row; dropping those would make a category the admin just used
   * disappear from the picker. Conversely a newly created category has no
   * products yet and must still be offerable — that's the whole reason the
   * table exists.
   */
  async listForPicker(): Promise<string[]> {
    return this.redis.getOrSet(
      `${CACHE_NS.categories}picker`,
      CACHE_TTL.categories,
      async () => {
        const [managed, inUse] = await Promise.all([
          this.safeRead(
            () =>
              this.prisma.category.findMany({
                where: { isActive: true },
                select: { slug: true },
              }),
            'picker',
          ),
          this.listInUse(),
        ]);

        // Same fail-open contract as the nav: the product form must keep
        // offering the categories the catalogue already uses even if the
        // managed table is unreadable, since this picker is the only way to
        // classify a new product.
        if (managed === null) return inUse;

        return [...new Set([...managed.map((m) => m.slug), ...inUse])].sort();
      },
    );
  }

  // ----------------------------------------------------------------- reads

  /**
   * The admin list: categories with a live product count, so an admin can see
   * at a glance which ones are actually carrying stock. One page at a time,
   * filtered in SQL.
   *
   * The screen used to pull every category and slice in the browser; search ran
   * there too. Both moved here so opening the screen costs one page of rows and
   * a search still matches categories that aren't on the page you're looking at.
   */
  async findAllPaged(
    query: CategoryListQuery = {},
  ): Promise<PaginatedResult<CategoryWithUsage>> {
    const params = parsePagination(query);
    const term = query.search?.trim();
    const where: Prisma.CategoryWhereInput = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.category.count({ where }),
      this.prisma.category.findMany({
        where,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        skip: params.skip,
        take: params.take,
      }),
    ]);

    // Counts are fetched for the page's slugs only — one grouped query over 10
    // rows rather than over the whole table.
    return paginate(await this.withUsage(rows), total, params);
  }

  /** Public read — active categories only. */
  async findPublic(): Promise<Category[]> {
    return this.redis.getOrSet(
      `${CACHE_NS.categories}public`,
      CACHE_TTL.categories,
      () =>
        this.prisma.category.findMany({
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        }),
    );
  }

  async findOne(id: string): Promise<CategoryWithUsage> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Category "${id}" not found`);
    const [withUsage] = await this.withUsage([row]);
    return withUsage;
  }

  /** One grouped count query rather than one per row. */
  private async withUsage(rows: Category[]): Promise<CategoryWithUsage[]> {
    if (rows.length === 0) return [];
    const counts = await this.prisma.product.groupBy({
      by: ['category'],
      where: { category: { in: rows.map((r) => r.slug) } },
      _count: { _all: true },
    });
    const bySlug = new Map(counts.map((c) => [c.category, c._count._all]));
    return rows.map((row) => ({
      ...row,
      productCount: bySlug.get(row.slug) ?? 0,
    }));
  }

  // ---------------------------------------------------------------- writes

  async create(dto: CreateCategoryDto): Promise<CategoryWithUsage> {
    const slug = this.resolveSlug(dto.slug, dto.name);
    await this.assertSlugFree(slug);

    const created = await this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        genders: dto.genders ?? [],
        description: dto.description?.trim() || null,
        image: dto.image?.trim() || null,
        isActive: dto.isActive ?? true,
        order: dto.order ?? 0,
      },
    });
    await this.invalidate();
    const [withUsage] = await this.withUsage([created]);
    return withUsage;
  }

  /**
   * Patch a category.
   *
   * Changing `slug` deliberately does NOT rewrite the products pointing at the
   * old value — those products would silently change what they are, and the
   * storefront's /category/<gender>-<slug> URLs would break with no redirect.
   * A slug already carrying products is refused outright; rename the display
   * name instead, which is what an admin almost always means.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryWithUsage> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Category "${id}" not found`);

    const data: Prisma.CategoryUpdateInput = {};

    if (dto.slug !== undefined) {
      const slug = this.resolveSlug(dto.slug, dto.name ?? existing.name);
      if (slug !== existing.slug) {
        const inUse = await this.prisma.product.count({
          where: { category: existing.slug },
        });
        if (inUse > 0) {
          throw new BadRequestException(
            `Cannot change the slug of "${existing.slug}" — ${inUse} product(s) use it. ` +
              'Rename the display name instead, or move those products first.',
          );
        }
        await this.assertSlugFree(slug);
        data.slug = slug;
      }
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.genders !== undefined) data.genders = dto.genders;
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.image !== undefined) data.image = dto.image?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.order !== undefined) data.order = dto.order;

    const updated = await this.prisma.category.update({ where: { id }, data });
    await this.invalidate();
    const [withUsage] = await this.withUsage([updated]);
    return withUsage;
  }

  /**
   * Delete a category row. Products keep their category value and stay
   * shoppable — this removes the editorial record, not the classification.
   * Refused while products still reference it, since the usual intent is to
   * retire a category, and `isActive: false` does that without losing the
   * artwork and copy.
   */
  async remove(id: string): Promise<{ success: true; id: string }> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Category "${id}" not found`);

    const inUse = await this.prisma.product.count({
      where: { category: existing.slug },
    });
    if (inUse > 0) {
      throw new ConflictException(
        `"${existing.name}" is used by ${inUse} product(s). ` +
          'Deactivate it instead, or move those products to another category first.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.invalidate();
    return { success: true, id };
  }

  /**
   * Create a row for every category already on a product.
   *
   * Idempotent — existing slugs are left exactly as they are, so running it
   * again never overwrites an admin's artwork or copy. Called once on first
   * read of the admin list so the screen opens populated instead of looking
   * like the catalogue has no categories.
   */
  async seedFromProducts(): Promise<{ seeded: number; total: number }> {
    const inUse = await this.listInUse();
    if (inUse.length === 0) {
      return { seeded: 0, total: await this.prisma.category.count() };
    }

    const existing = await this.prisma.category.findMany({
      where: { slug: { in: inUse } },
      select: { slug: true },
    });
    const have = new Set(existing.map((e) => e.slug));
    const missing = inUse.filter((slug) => !have.has(slug));

    if (missing.length > 0) {
      // Seed each category's genders from the products that actually use it,
      // so the row starts out describing the catalogue rather than guessing.
      const pairs = await this.prisma.product.findMany({
        distinct: ['category', 'gender'],
        select: { category: true, gender: true },
        where: { category: { in: missing } },
      });
      const gendersBySlug = new Map<string, Gender[]>();
      for (const { category, gender } of pairs) {
        const list = gendersBySlug.get(category) ?? [];
        if (!list.includes(gender)) list.push(gender);
        gendersBySlug.set(category, list);
      }

      await this.prisma.category.createMany({
        data: missing.map((slug, i) => ({
          slug,
          name: this.titleCase(slug),
          genders: gendersBySlug.get(slug) ?? [],
          order: i,
        })),
        skipDuplicates: true,
      });
      await this.invalidate();
    }

    return {
      seeded: missing.length,
      total: await this.prisma.category.count(),
    };
  }

  // ------------------------------------------------------------- internals

  private resolveSlug(slug: string | undefined, name: string): string {
    const candidate = (slug?.trim() || this.slugify(name)).toLowerCase();
    if (!candidate) {
      throw new BadRequestException('Could not derive a slug from that name');
    }
    return candidate;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** "co-ord-sets" → "Co-ord sets" — sentence case, matching the storefront. */
  private titleCase(slug: string): string {
    const words = slug.replace(/-/g, ' ').trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : slug;
  }

  /**
   * The managed rows for a set of slugs, or `null` if the table itself could
   * not be read.
   *
   * `null` is not the same answer as `[]`: empty means "nothing is curated
   * yet", null means "there is no curation layer right now". Storefront-facing
   * callers treat the second as a reason to fall back to pure derivation.
   */
  private safeFindBySlugs(slugs: string[]): Promise<Category[] | null> {
    return this.safeRead(
      () =>
        this.prisma.category.findMany({
          where: { slug: { in: slugs } },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        }),
      'nav',
    );
  }

  /**
   * Runs a read against the Category table, resolving `null` instead of
   * throwing if that table cannot be read.
   *
   * Scoped to the two paths that have a usable answer without it. Admin CRUD
   * deliberately does NOT use this — there, a failure must surface, because
   * silently reporting "no categories" to someone about to create one is worse
   * than an error. Note this table is newer than the deployments that read
   * from it, so "relation does not exist" is a state to survive, not a bug.
   */
  private async safeRead<T>(
    read: () => Promise<T>,
    context: string,
  ): Promise<T | null> {
    try {
      return await read();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Category table unreadable (${context}) — serving derived categories only: ${message}`,
      );
      return null;
    }
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const clash = await this.prisma.category.findUnique({ where: { slug } });
    if (clash) {
      throw new ConflictException(`A category with the slug "${slug}" already exists`);
    }
  }

  /** Every cached category read derives from this table or from products. */
  private invalidate(): Promise<void> {
    return this.redis.invalidate(`${CACHE_NS.categories}*`);
  }
}
