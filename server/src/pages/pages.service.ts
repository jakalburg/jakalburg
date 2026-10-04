import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Page } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CACHE_NS, CACHE_TTL } from '../redis/cache-keys';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { DEFAULT_PAGES, toCreateInput } from './pages.defaults';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

export interface PageListQuery extends PaginationQuery {
  /** Free text over title and slug. */
  search?: string;
}

/**
 * What the admin's Quill editor can produce, and nothing more. Page content is
 * rendered into the storefront with dangerouslySetInnerHTML, so it is
 * sanitised HERE — once, at the write boundary — rather than on every render.
 * That keeps what's in the database already safe.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'span',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    // Quill marks indent levels with ql-indent-* classes.
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  // Never let stored markup open a window with access back to ours.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

@Injectable()
export class PagesService {
  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Admin: one page of pages, oldest first so the table order is stable.
   * Uncached — the admin must always see exactly what it just saved.
   *
   * This table is small today (five seeded pages), but the screen asks for a
   * page at a time anyway so it behaves like every other admin table and can't
   * degrade as pages are added.
   */
  async findAll(query: PageListQuery = {}): Promise<PaginatedResult<Page>> {
    const params = parsePagination(query);
    const term = query.search?.trim();
    const where: Prisma.PageWhereInput = term
      ? {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { slug: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.page.count({ where }),
      this.prisma.page.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(rows, total, params);
  }

  /** Public: only pages an admin has left active. */
  findPublished(): Promise<Page[]> {
    return this.redis.getOrSet(
      `${CACHE_NS.pages}published`,
      CACHE_TTL.pages,
      () =>
        this.prisma.page.findMany({
          where: { status: 'active' },
          orderBy: { createdAt: 'asc' },
        }),
    );
  }

  /** Drop every cached page read. Called after any write. */
  private invalidate(): Promise<void> {
    return this.redis.invalidate(`${CACHE_NS.pages}*`);
  }

  async findOne(id: string): Promise<Page> {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  /**
   * Public read by slug. Inactive pages 404 so an admin can draft a page
   * without it being reachable on the storefront.
   */
  async findBySlug(slug: string): Promise<Page> {
    // The NotFound is thrown outside the loader, so a 404 is never cached —
    // publishing a draft would otherwise keep 404ing until the TTL expired.
    const page = await this.redis.getOrSet(
      `${CACHE_NS.pages}slug:${slug}`,
      CACHE_TTL.pages,
      () => this.prisma.page.findUnique({ where: { slug } }),
    );
    if (!page || page.status !== 'active') {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async create(dto: CreatePageDto): Promise<Page> {
    await this.assertSlugFree(dto.slug);
    const page = await this.prisma.page.create({ data: this.toWriteData(dto) });
    await this.invalidate();
    return page;
  }

  async update(id: string, dto: UpdatePageDto): Promise<Page> {
    const current = await this.findOne(id);
    if (dto.slug && dto.slug !== current.slug) {
      await this.assertSlugFree(dto.slug);
    }
    const page = await this.prisma.page.update({
      where: { id },
      data: this.toWriteData(dto),
    });
    await this.invalidate();
    return page;
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.page.delete({ where: { id } });
    await this.invalidate();
    return { id };
  }

  /**
   * Idempotently create any missing default page. Existing rows are left
   * ALONE — seeding must never clobber copy an admin has edited.
   */
  async seedDefaults(): Promise<{
    seeded: number;
    total: number;
    message: string;
  }> {
    let seeded = 0;
    for (const page of DEFAULT_PAGES) {
      const existing = await this.prisma.page.findUnique({
        where: { slug: page.slug },
      });
      if (!existing) {
        await this.prisma.page.create({ data: toCreateInput(page) });
        seeded++;
      }
    }
    if (seeded) await this.invalidate();
    const total = await this.prisma.page.count();
    return {
      seeded,
      total,
      message: seeded
        ? `Seeded ${seeded} default page${seeded === 1 ? '' : 's'}.`
        : 'All default pages already exist — nothing changed.',
    };
  }

  private async assertSlugFree(slug: string): Promise<void> {
    const clash = await this.prisma.page.findUnique({ where: { slug } });
    if (clash) {
      throw new BadRequestException(`A page with slug "${slug}" already exists`);
    }
  }

  /**
   * `faqSections` is Json: only touch it when the caller actually sent it, so
   * a partial patch (e.g. the status toggle) can't blank an FAQ.
   */
  private toWriteData(
    dto: CreatePageDto | UpdatePageDto,
  ): Prisma.PageUncheckedCreateInput & Prisma.PageUncheckedUpdateInput {
    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.content !== undefined) {
      data.content = sanitizeHtml(dto.content, SANITIZE_OPTIONS);
    }
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.faqSections !== undefined) {
      // FAQ Q&A is rendered as plain text on the storefront, so strip markup
      // entirely rather than allowing a subset through.
      data.faqSections = dto.faqSections.map((section) => ({
        heading: sanitizeHtml(section.heading, { allowedTags: [] }),
        items: section.items.map((item) => ({
          question: sanitizeHtml(item.question, { allowedTags: [] }),
          answer: sanitizeHtml(item.answer, { allowedTags: [] }),
        })),
      })) as unknown as Prisma.InputJsonValue;
    }
    return data as Prisma.PageUncheckedCreateInput &
      Prisma.PageUncheckedUpdateInput;
  }
}
