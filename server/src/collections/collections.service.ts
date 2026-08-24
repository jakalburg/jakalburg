import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Collection, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';

/**
 * The 6 collections the storefront shipped with as hardcoded data
 * (client/src/data/collections.ts). Seeded so nothing disappears when the
 * storefront switches to the live table and products already tagged with these
 * slugs keep matching.
 */
const SEED_COLLECTIONS: Array<
  Pick<
    Collection,
    'slug' | 'title' | 'subtitle' | 'description' | 'image' | 'order'
  >
> = [
  {
    slug: 'summer-essentials',
    title: 'Summer Essentials',
    subtitle: 'Linen, cotton, ease.',
    description:
      'A capsule of breathable pieces built for warm months — washed linen, weightless cotton, and easy silhouettes.',
    image:
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=80',
    order: 0,
  },
  {
    slug: 'monochrome',
    title: 'Monochrome',
    subtitle: 'One tone, many shapes.',
    description:
      'Ivory, ink, and charcoal — a study in restraint. Every piece designed to layer with the next.',
    image:
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80',
    order: 1,
  },
  {
    slug: 'workwear',
    title: 'Workwear',
    subtitle: 'Made to be worn hard.',
    description:
      'Denim, oxford cotton, and rugged twills — pieces that soften with wear and get better every wash.',
    image:
      'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=1400&q=80',
    order: 2,
  },
  {
    slug: 'weekend',
    title: 'Weekend',
    subtitle: 'Off-hours uniform.',
    description:
      'Bombers, overshirts, and easy trousers — pieces to slip into when nothing is required.',
    image:
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1400&q=80',
    order: 3,
  },
  {
    slug: 'atelier',
    title: 'Atelier',
    subtitle: 'Tailored, considered.',
    description:
      'Softly tailored pieces cut from Italian wools and cottons — the wardrobe you keep for years.',
    image:
      'https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?auto=format&fit=crop&w=1400&q=80',
    order: 4,
  },
  {
    slug: 'essentials',
    title: 'The Essentials',
    subtitle: "The pieces you'll reach for daily.",
    description:
      'Tees, tanks, polos, shirts, and knits — the foundational layers that make the rest work.',
    image:
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=80',
    order: 5,
  },
];

/**
 * CollectionsService — CRUD for the storefront's editorial collections. Mirrors
 * the FabricsService slug/uniqueness helpers. Membership lives on the product
 * (Product.collections string[] of slugs), so `productCount` is derived per
 * collection rather than stored.
 *
 * NOTE: write routes are UNGUARDED for now (see the controller). Protect with
 * JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** All collections, ordered — each with a live product count. */
  async findAll(): Promise<CollectionResponseDto[]> {
    const collections = await this.prisma.collection.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return Promise.all(collections.map((c) => this.withCount(c)));
  }

  async findById(id: string): Promise<CollectionResponseDto> {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException(`Collection "${id}" not found`);
    return this.withCount(collection);
  }

  async create(dto: CreateCollectionDto): Promise<CollectionResponseDto> {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Collection title is required');
    const slug = await this.uniqueSlug(dto.slug?.trim() || title);
    try {
      const created = await this.prisma.collection.create({
        data: {
          slug,
          title,
          subtitle: dto.subtitle?.trim() || null,
          image: dto.image?.trim() || null,
          description: dto.description?.trim() || null,
          enabled: dto.enabled ?? true,
          order: dto.order ?? (await this.nextOrder()),
        },
      });
      return this.withCount(created);
    } catch (e) {
      throw this.rethrowDuplicate(e, title);
    }
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<CollectionResponseDto> {
    const existing = await this.prisma.collection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Collection "${id}" not found`);

    const data: Prisma.CollectionUpdateInput = {};
    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) throw new BadRequestException('Collection title cannot be empty');
      data.title = title;
    }
    // Slug is the product-membership key: only change it when the admin passes
    // an explicit new slug (a plain title edit must NOT re-slug, or every product
    // tagged with the old slug would silently drop out of the collection).
    if (dto.slug !== undefined && this.slugify(dto.slug) !== existing.slug) {
      data.slug = await this.uniqueSlug(dto.slug);
    }
    if (dto.subtitle !== undefined) data.subtitle = dto.subtitle?.trim() || null;
    if (dto.image !== undefined) data.image = dto.image?.trim() || null;
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.order !== undefined) data.order = dto.order;

    try {
      const updated = await this.prisma.collection.update({ where: { id }, data });
      return this.withCount(updated);
    } catch (e) {
      throw this.rethrowDuplicate(e, dto.title ?? existing.title);
    }
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.collection.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });
    if (!existing) throw new NotFoundException(`Collection "${id}" not found`);
    await this.prisma.collection.delete({ where: { id } });
    // Tidy up: drop the now-dangling slug from any product's collections array.
    await this.prisma.$executeRaw`
      UPDATE "Product"
      SET "collections" = array_remove("collections", ${existing.slug})
      WHERE ${existing.slug} = ANY("collections")`;
    return { success: true, id };
  }

  /**
   * Idempotent seed: creates only the collections whose slug is missing (never
   * overwrites an admin's edits), then backfills each product's `collections`
   * array from the legacy single `collection` slug so existing products keep
   * their membership after the storefront switch.
   */
  async seed(): Promise<{ created: number; slugs: string[] }> {
    const created: string[] = [];
    for (const c of SEED_COLLECTIONS) {
      const exists = await this.prisma.collection.findUnique({
        where: { slug: c.slug },
      });
      if (exists) continue;
      await this.prisma.collection.create({ data: { ...c, enabled: true } });
      created.push(c.slug);
    }
    // One-time backfill: legacy Product.collection (singular slug) -> collections[].
    await this.prisma.$executeRaw`
      UPDATE "Product"
      SET "collections" = ARRAY["collection"]
      WHERE "collection" IS NOT NULL
        AND "collection" <> ''
        AND cardinality("collections") = 0`;
    return { created: created.length, slugs: created };
  }

  // ---- helpers --------------------------------------------------------------

  private async withCount(c: Collection): Promise<CollectionResponseDto> {
    const productCount = await this.prisma.product.count({
      where: { collections: { has: c.slug } },
    });
    return { ...c, productCount };
  }

  private async nextOrder(): Promise<number> {
    const last = await this.prisma.collection.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? -1) + 1;
  }

  /** Turn a Prisma unique-constraint violation into a friendly 400. */
  private rethrowDuplicate(e: unknown, name: string): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new BadRequestException(`A collection "${name}" already exists`);
    }
    return e as Error;
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root = this.slugify(base) || 'collection';
    let candidate = root;
    let n = 2;
    while (
      await this.prisma.collection.findUnique({ where: { slug: candidate } })
    ) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }
}
