import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product, ProductColor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductQueryDto } from './dto/product-query.dto';
import {
  AdminProductListResponseDto,
  AdminProductResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Params the admin catalogue list/search accept. */
export interface AdminListParams {
  skip?: number;
  take?: number;
  status?: string; // 'active' | 'disabled'/'inactive' | 'all'
  search?: string;
  category?: string;
  sort?: string;
}

type ProductWithColors = Product & { colors: ProductColor[] };

// Always pull colours ordered so swatches render in the curated order.
const INCLUDE_COLORS = {
  colors: { orderBy: { position: 'asc' as const } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** List products with optional filters + sort. Returns the full catalogue
   *  when no filters are given (the storefront fetches all and facets on the
   *  client, matching its original static-data behaviour). */
  async findAll(query: ProductQueryDto): Promise<ProductResponseDto[]> {
    // Only storefront-visible products (admin can hide via isActive).
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.gender) where.gender = query.gender;
    if (query.category) where.category = query.category;
    if (query.collection) where.collection = query.collection;
    if (query.isNew !== undefined) where.isNew = query.isNew;
    if (query.onSale !== undefined) where.onSale = query.onSale;
    if (query.essential !== undefined) where.essential = query.essential;
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { tags: { has: term.toLowerCase() } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: this.resolveSort(query.sort),
      include: INCLUDE_COLORS,
    });

    return products.map((p) => this.toResponse(p));
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    // findFirst (not findUnique) so we can also gate on isActive — a hidden
    // product's detail page should 404 for the storefront.
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: INCLUDE_COLORS,
    });
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

  /** Distinct category slugs across the whole catalogue (for admin pickers). */
  async listCategories(): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
      where: { category: { not: '' } },
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category);
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
      colors: p.colors.map((c) => ({ name: c.name, hex: c.hex })),
      sizes: p.sizes,
      soldOutSizes: p.soldOutSizes,
      tags: p.tags,
      isNew: p.isNew,
      onSale: p.onSale,
      collection: p.collection ?? undefined,
      essential: p.essential,
      description: p.description,
      fabric: p.fabric,
      care: p.care,
      stock: p.stock,
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
        essential: dto.essential ?? false,
        description: dto.description,
        fabric: dto.fabric,
        care: dto.care,
        stock: dto.stock ?? 0,
        isActive: dto.isActive ?? true,
        colors: dto.colors?.length
          ? {
              create: dto.colors.map((c, i) => ({
                name: c.name,
                hex: c.hex,
                position: c.position ?? i,
              })),
            }
          : undefined,
      },
      include: INCLUDE_COLORS,
    });
    return this.toAdminResponse(product);
  }

  /** Paginated admin catalogue — includes inactive products, filterable by status. */
  async adminList(params: AdminListParams): Promise<AdminProductListResponseDto> {
    const skip = Math.max(0, params.skip ?? 0);
    // Default page size ~10; clamp to 1..100 so a caller can't request the lot.
    const take = Math.min(100, Math.max(1, params.take ?? 10));

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
        skip,
        take,
      }),
    ]);

    return {
      data: rows.map((p) => this.toAdminResponse(p)),
      total,
      skip,
      take,
      hasMore: skip + rows.length < total,
    };
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
    if (dto.essential !== undefined) data.essential = dto.essential;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.fabric !== undefined) data.fabric = dto.fabric;
    if (dto.care !== undefined) data.care = dto.care;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Slug change (kept unique). Only when the caller passes a different slug.
    if (dto.slug && this.slugify(dto.slug) !== existing.slug) {
      data.slug = await this.uniqueSlug(dto.slug);
    }

    if (dto.colors !== undefined) {
      data.colors = {
        deleteMany: {},
        create: dto.colors.map((c, i) => ({
          name: c.name,
          hex: c.hex,
          position: c.position ?? i,
        })),
      };
    }

    const product = await this.prisma.product.update({
      where: { id },
      data,
      include: INCLUDE_COLORS,
    });
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
    return { count: res.count };
  }

  /** Delete a product (colours cascade via the relation). */
  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { success: true, id };
  }

  // ---- helpers --------------------------------------------------------------

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
