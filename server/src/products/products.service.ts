import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender, Prisma, Product, ProductColor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CategoriesService } from '../categories/categories.service';
import { CACHE_NS, CACHE_TTL, cacheKeyFor } from '../redis/cache-keys';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AdminProductListResponseDto,
  AdminProductResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { CreateProductDto, ProductColorDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

/** Params the admin catalogue list/search accept. Pagination fields take raw
 *  query strings too — `parsePagination` normalises and clamps them. */
export interface AdminListParams extends PaginationQuery {
  status?: string; // 'active' | 'disabled'/'inactive' | 'all'
  search?: string;
  category?: string;
  sort?: string;
}

/** Distinct filter values for a slice of the catalogue, so the storefront can
 *  render complete size/colour chips without holding every product in memory. */
export interface ProductFacetsDto {
  sizes: string[];
  colors: string[];
}

type ProductWithColors = Product & { colors: ProductColor[] };

// Always pull colours ordered so swatches render in the curated order.
const INCLUDE_COLORS = {
  colors: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly categories: CategoriesService,
  ) {}

  /**
   * Drop every cached product read. Also clears the collection and category
   * namespaces: a product write changes the `productCount` the nav renders,
   * and a stale count is exactly the kind of wrongness nobody reports but
   * everyone sees. Categories go too because their nav/picker lists are
   * derived from which products exist — adding the first product in a
   * category has to make that category appear.
   */
  private invalidate(): Promise<void> {
    return this.redis.invalidate(
      `${CACHE_NS.products}*`,
      `${CACHE_NS.collections}*`,
      `${CACHE_NS.categories}*`,
    );
  }

  /**
   * Storefront product list — filtered, sorted and paginated in the database.
   * Returns one page (default 10) inside the standard envelope; the shopper
   * pulls further pages as they scroll rather than downloading the catalogue.
   */
  async findAll(
    query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductResponseDto>> {
    const where = this.buildStorefrontWhere(query);
    const params = parsePagination(query);

    // A free-text search mints a key per distinct term — read once, then dead
    // weight until it expires. Those go straight to Postgres.
    if (query.search?.trim()) return this.loadAll(where, query, params);

    return this.redis.getOrSet(
      cacheKeyFor(CACHE_NS.products, {
        list: 1,
        category: query.category,
        collection: query.collection,
        gender: query.gender,
        size: query.size,
        color: query.color,
        isNew: query.isNew,
        onSale: query.onSale,
        essential: query.essential,
        // Order matters to the key but not to the result, so sort it.
        ids: query.ids?.length ? [...query.ids].sort().join(',') : undefined,
        sort: query.sort,
        page: params.skip,
        take: params.take,
      }),
      CACHE_TTL.productList,
      () => this.loadAll(where, query, params),
    );
  }

  private async loadAll(
    where: Prisma.ProductWhereInput,
    query: ProductQueryDto,
    params: ReturnType<typeof parsePagination>,
  ): Promise<PaginatedResult<ProductResponseDto>> {
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: this.resolveSort(query.sort),
        include: INCLUDE_COLORS,
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(
      products.map((p) => this.toResponse(p)),
      total,
      params,
    );
  }

  /**
   * Distinct sizes + colour names across everything matching the given filters
   * (ignoring size/colour themselves, so picking one doesn't erase the others).
   *
   * This exists because the collection pages render their filter chips from the
   * whole matching set, which pagination no longer keeps in memory.
   *
   * COST: filtering happens in SQL, but the de-duplication does not — this
   * reads two narrow columns for every matching row. That is cheap at this
   * catalogue's size and the storefront caches the result for 5 minutes. If the
   * catalogue reaches the tens of thousands, push the distinct into Postgres
   * (`unnest(sizes) WITH ORDINALITY` + `DISTINCT`), which means expressing the
   * filter in raw SQL as well.
   */
  async listFacets(query: ProductQueryDto): Promise<ProductFacetsDto> {
    const where = this.buildStorefrontWhere({
      ...query,
      size: undefined,
      color: undefined,
    });

    const [rows, colors] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, select: { sizes: true } }),
      this.prisma.productColor.findMany({
        where: { product: where },
        select: { name: true },
        distinct: ['name'],
        orderBy: { name: 'asc' },
      }),
    ]);

    // Sizes live in a String[] column, so "distinct" has to happen here. Order
    // is preserved from the catalogue (XS, S, M, …) rather than alphabetised,
    // which would read as "L, M, S, XL".
    const sizes: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const size of row.sizes) {
        if (!seen.has(size)) {
          seen.add(size);
          sizes.push(size);
        }
      }
    }

    return { sizes, colors: colors.map((c) => c.name) };
  }

  /** Shared filter for every storefront read — visible products only. */
  private buildStorefrontWhere(query: ProductQueryDto): Prisma.ProductWhereInput {
    // Only storefront-visible products (admin can hide via isActive).
    const where: Prisma.ProductWhereInput = { isActive: true };

    // Collection membership and free-text search are each an OR of several
    // conditions, and both may be active at once — so they go into AND as
    // separate groups rather than both writing `where.OR` (where the second
    // would silently overwrite the first and widen the result set).
    const and: Prisma.ProductWhereInput[] = [];

    if (query.gender) where.gender = query.gender;
    if (query.category) where.category = query.category;
    if (query.isNew !== undefined) where.isNew = query.isNew;
    if (query.onSale !== undefined) where.onSale = query.onSale;
    if (query.essential !== undefined) where.essential = query.essential;
    if (query.size) where.sizes = { has: query.size };
    if (query.color) where.colors = { some: { name: query.color } };
    if (query.ids?.length) where.id = { in: query.ids };

    if (query.collection) {
      const slug = query.collection;
      and.push({
        OR: [
          // Current model: membership is a list of collection slugs.
          { collections: { has: slug } },
          // Legacy single-collection column, still set on older rows.
          { collection: slug },
          // "Essentials" is a flag rather than a collection row.
          ...(slug === 'essentials'
            ? [{ essential: true } as Prisma.ProductWhereInput]
            : []),
        ],
      });
    }

    if (query.search) {
      const term = query.search.trim();
      and.push({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { tags: { has: term.toLowerCase() } },
        ],
      });
    }

    if (and.length) where.AND = and;

    return where;
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    // findFirst (not findUnique) so we can also gate on isActive — a hidden
    // product's detail page should 404 for the storefront.
    // The 404 is raised OUTSIDE the loader so a miss is never cached: an admin
    // activating a product would otherwise keep 404ing until the TTL expired.
    const product = await this.redis.getOrSet(
      `${CACHE_NS.products}slug:${slug}`,
      CACHE_TTL.productDetail,
      () =>
        this.prisma.product.findFirst({
          where: { slug, isActive: true },
          include: INCLUDE_COLORS,
        }),
    );
    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }
    return this.toResponse(product);
  }

  /** Related products: same category first, topped up with same-gender picks. */
  async findRelated(slug: string, limit = 4): Promise<ProductResponseDto[]> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product) {
      throw new NotFoundException(`Product "${slug}" not found`);
    }

    const primary = await this.prisma.product.findMany({
      where: { slug: { not: slug }, category: product.category, isActive: true },
      include: INCLUDE_COLORS,
      take: limit,
    });

    if (primary.length >= limit) {
      return primary.map((p) => this.toResponse(p));
    }

    const excludeSlugs = [slug, ...primary.map((p) => p.slug)];
    const fill = await this.prisma.product.findMany({
      where: { slug: { notIn: excludeSlugs }, gender: product.gender, isActive: true },
      include: INCLUDE_COLORS,
      take: limit - primary.length,
    });

    return [...primary, ...fill].map((p) => this.toResponse(p));
  }

  /**
   * Distinct category slugs across the whole catalogue (for admin pickers).
   *
   * Deliberately NOT paginated: the result is a bounded set of slugs, and a
   * picker that only showed the first page of categories would be wrong. The
   * same COST caveat as {@link listFacets} applies — Prisma de-duplicates
   * `distinct` in memory, so this reads one narrow column for every product.
   */
  /**
   * Distinct category slugs.
   *
   * Without a gender: every category in the catalogue, hidden products
   * included. This is the admin's category picker, which must still offer a
   * category whose products happen to all be switched off right now.
   *
   * With a gender: the categories a shopper can actually browse under it —
   * active products only. The storefront nav reads this, and listing a
   * category with nothing live in it would just lead to an empty page.
   *
   * Gender is matched exactly, with no `unisex` fallthrough, because that is
   * how `findAll` filters it — if the nav were more generous than the listing
   * page it would link to categories that come back empty.
   */
  async listCategories(gender?: Gender): Promise<string[]> {
    // Delegated to CategoriesService so the "has stock AND is offered" rule
    // lives in exactly one place. Without a gender this is still the bare
    // catalogue-wide list the admin's category picker expects.
    return gender
      ? this.categories.listForNav(gender)
      : this.categories.listInUse();
  }

  private resolveSort(
    sort: ProductQueryDto['sort'],
  ): Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price-asc':
        return { price: 'asc' };
      case 'price-desc':
        return { price: 'desc' };
      case 'newest':
        return { createdAt: 'desc' };
      case 'featured':
      default:
        // Essentials first, then newest — a sensible default ordering.
        return [{ essential: 'desc' }, { createdAt: 'desc' }];
    }
  }

  /** Map a Prisma row to the storefront's `Product` shape. */
  private toResponse(p: ProductWithColors): ProductResponseDto {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      gender: p.gender,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? undefined,
      images: p.images,
      colors: p.colors.map((c) => ({
        name: c.name,
        hex: c.hex,
        images: c.images,
        sizes: c.sizes,
        soldOutSizes: c.soldOutSizes,
        price: c.price ?? undefined,
        compareAtPrice: c.compareAtPrice ?? undefined,
        stock: c.stock ?? undefined,
      })),
      sizes: p.sizes,
      soldOutSizes: p.soldOutSizes,
      tags: p.tags,
      isNew: p.isNew,
      onSale: p.onSale,
      collection: p.collection ?? undefined,
      collections: p.collections ?? [],
      essential: p.essential,
      description: p.description,
      fabric: p.fabric,
      care: p.care,
      stock: p.stock,
      // Denormalized on Product and maintained by ReviewsService — no join here.
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      reviewsHidden: p.reviewsHidden,
    };
  }

  // ---------------------------------------------------------------------------
  // Admin — write + management. Structure mirrors the kaybykhushie reference
  // (admin/* list split, isActive visibility gate, bulk status) but operates on
  // this project's lean Product model.
  //
  // NOTE: these routes are currently UNGUARDED to unblock the admin UI (which
  // still uses a mock auth session). Before any non-local deployment, protect
  // them with JwtAuthGuard + RolesGuard('admin') — the guards already exist in
  // server/src/auth and are wired into orders/cart/addresses.
  // ---------------------------------------------------------------------------

  /** Create a product (+ its colours). Slug is auto-generated & de-duplicated. */
  async create(dto: CreateProductDto): Promise<AdminProductResponseDto> {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const product = await this.prisma.product.create({
      data: {
        slug,
        title: dto.title,
        gender: dto.gender,
        category: dto.category,
        price: dto.price,
        compareAtPrice: dto.compareAtPrice ?? null,
        images: dto.images ?? [],
        sizes: dto.sizes ?? [],
        soldOutSizes: dto.soldOutSizes ?? [],
        tags: dto.tags ?? [],
        isNew: dto.isNew ?? false,
        onSale: dto.onSale ?? false,
        collection: dto.collection ?? null,
        collections: dto.collections ?? [],
        essential: dto.essential ?? false,
        description: dto.description,
        fabric: dto.fabric,
        care: dto.care,
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
        reviewsHidden: dto.reviewsHidden ?? false,
        colors: dto.colors?.length
          ? { create: dto.colors.map((c, i) => this.toColorCreate(c, i)) }
          : undefined,
      },
      include: INCLUDE_COLORS,
    });
    await this.invalidate();
    return this.toAdminResponse(product);
  }

  /** Paginated admin catalogue — includes inactive products, filterable by status. */
  async adminList(params: AdminListParams): Promise<AdminProductListResponseDto> {
    // Defaults to page 1 × 10 rows and clamps `take` to 100 — see parsePagination.
    const pagination = parsePagination(params);

    const where: Prisma.ProductWhereInput = {};
    if (params.status === 'active') where.isActive = true;
    else if (params.status === 'disabled' || params.status === 'inactive')
      where.isActive = false;
    if (params.category) where.category = params.category;
    if (params.search) {
      const term = params.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: this.resolveAdminSort(params.sort),
        include: INCLUDE_COLORS,
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return paginate(
      rows.map((p) => this.toAdminResponse(p)),
      total,
      pagination,
    );
  }

  /** Admin free-text search (same envelope as the list). */
  adminSearch(query: string, params: AdminListParams = {}): Promise<AdminProductListResponseDto> {
    return this.adminList({ ...params, search: query });
  }

  /** Fetch one product by id for the admin (visible OR hidden). */
  async adminFindById(id: string): Promise<AdminProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: INCLUDE_COLORS,
    });
    if (!product) throw new NotFoundException(`Product "${id}" not found`);
    return this.toAdminResponse(product);
  }

  /** Patch a product. Colours, when supplied, replace the existing set. */
  async update(id: string, dto: UpdateProductDto): Promise<AdminProductResponseDto> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Product "${id}" not found`);

    const data: Prisma.ProductUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.gender !== undefined) data.gender = dto.gender;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.compareAtPrice !== undefined) data.compareAtPrice = dto.compareAtPrice;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.sizes !== undefined) data.sizes = dto.sizes;
    if (dto.soldOutSizes !== undefined) data.soldOutSizes = dto.soldOutSizes;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.isNew !== undefined) data.isNew = dto.isNew;
    if (dto.onSale !== undefined) data.onSale = dto.onSale;
    if (dto.collection !== undefined) data.collection = dto.collection;
    if (dto.collections !== undefined) data.collections = dto.collections;
    if (dto.essential !== undefined) data.essential = dto.essential;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.fabric !== undefined) data.fabric = dto.fabric;
    if (dto.care !== undefined) data.care = dto.care;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.reviewsHidden !== undefined) data.reviewsHidden = dto.reviewsHidden;

    // Slug change (kept unique). Only when the caller passes a different slug.
    if (dto.slug && this.slugify(dto.slug) !== existing.slug) {
      data.slug = await this.uniqueSlug(dto.slug);
    }

    if (dto.colors !== undefined) {
      data.colors = {
        deleteMany: {},
        create: dto.colors.map((c, i) => this.toColorCreate(c, i)),
      };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: INCLUDE_COLORS,
    });
    await this.invalidate();
    return this.toAdminResponse(product);
  }

  /** Toggle a single product's storefront visibility. */
  async updateStatus(id: string, isActive: boolean): Promise<AdminProductResponseDto> {
    await this.ensureExists(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive },
      include: INCLUDE_COLORS,
    });
    await this.invalidate();
    return this.toAdminResponse(product);
  }

  /** Enable/disable many products at once. */
  async bulkUpdateStatus(
    productIds: string[],
    isActive: boolean,
  ): Promise<{ count: number }> {
    const res = await this.prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: { isActive },
    });
    await this.invalidate();
    return { count: res.count };
  }

  /** Delete a product (colours cascade via the relation). */
  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    await this.invalidate();
    return { success: true, id };
  }

  // ---- helpers --------------------------------------------------------------

  /** Map a colour DTO to a Prisma nested-create row. A blank array / omitted
   *  number is stored as-is (empty array / null) and means "inherit the
   *  product-level default" — the storefront applies that fallback at render. */
  private toColorCreate(
    c: ProductColorDto,
    index: number,
  ): Prisma.ProductColorCreateWithoutProductInput {
    return {
      name: c.name,
      hex: c.hex,
      position: c.position ?? index,
      images: c.images ?? [],
      sizes: c.sizes ?? [],
      soldOutSizes: c.soldOutSizes ?? [],
      price: c.price ?? null,
      compareAtPrice: c.compareAtPrice ?? null,
      stock: c.stock ?? null,
    };
  }

  private toAdminResponse(p: ProductWithColors): AdminProductResponseDto {
    return {
      ...this.toResponse(p),
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private resolveAdminSort(sort?: string): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case 'price-asc':
        return { price: 'asc' };
      case 'price-desc':
        return { price: 'desc' };
      case 'name-asc':
        return { title: 'asc' };
      case 'name-desc':
        return { title: 'desc' };
      case 'oldest':
        return { createdAt: 'asc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /** Slugify + guarantee uniqueness by appending -2, -3, … when taken. */
  private async uniqueSlug(base: string): Promise<string> {
    const root = this.slugify(base) || 'product';
    let candidate = root;
    let n = 2;
    while (await this.prisma.product.findUnique({ where: { slug: candidate } })) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }

  private async ensureExists(id: string): Promise<void> {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!p) throw new NotFoundException(`Product "${id}" not found`);
  }
}
