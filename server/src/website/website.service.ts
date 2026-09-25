import { Injectable, NotFoundException } from '@nestjs/common';
import { HomeSection, Prisma, WebsiteContact } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { UpdateWebsiteContactDto } from './dto/update-website-contact.dto';
import { DEFAULT_HOME_SECTIONS } from './home-sections.defaults';

/** Seeded once, the first time anyone reads the Contact page content. */
const DEFAULT_CONTACT: Prisma.WebsiteContactCreateInput = {
  title: "We're here to help.",
  formDescription:
    'Questions about a piece, an order, or fit? Our care team responds within one business day.',
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
  constructor(private readonly prisma: PrismaService) {}

  /** Every section (incl. disabled), ordered — the admin table's shape. */
  findAllSections(): Promise<HomeSection[]> {
    return this.prisma.homeSection.findMany({ orderBy: { order: 'asc' } });
  }

  /**
   * The enabled hero slider config for the storefront: its slides plus the
   * `fullBleed` flag (true → edge-to-edge photo carousel; false → split
   * text+image layout). `slides` is empty when the section is missing, disabled,
   * or has none, so the client can cleanly fall back to its static hero.
   */
  async getHeroConfig(): Promise<{ fullBleed: boolean; slides: any[] }> {
    const hero = await this.prisma.homeSection.findUnique({
      where: { type: 'HeroSlider' },
    });
    const slides =
      hero && hero.enabled && Array.isArray(hero.data)
        ? (hero.data as any[])
        : [];
    return { fullBleed: !!hero?.fullBleed, slides };
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

    return this.prisma.homeSection.update({ where: { id }, data });
  }

  /**
   * The storefront Contact page content (public). It's a singleton row — created
   * with sensible defaults on first read, so the admin/storefront never see null.
   */
  async getContact(): Promise<WebsiteContact> {
    const existing = await this.prisma.websiteContact.findFirst();
    if (existing) return existing;
    return this.prisma.websiteContact.create({ data: DEFAULT_CONTACT });
  }

  /** Admin: patch the Contact page content (upserts the singleton). */
  async updateContact(
    dto: UpdateWebsiteContactDto,
  ): Promise<WebsiteContact> {
    const current = await this.getContact(); // ensures the row exists
    return this.prisma.websiteContact.update({
      where: { id: current.id },
      data: dto,
    });
  }

  /** Idempotently create any missing default sections; existing rows untouched. */
  async seedDefaults(): Promise<{ seeded: number; total: number }> {
    let seeded = 0;
    for (const section of DEFAULT_HOME_SECTIONS) {
      const existing = await this.prisma.homeSection.findUnique({
        where: { type: section.type },
      });
      if (!existing) {
        await this.prisma.homeSection.create({ data: section });
        seeded++;
      }
    }
    const total = await this.prisma.homeSection.count();
    return { seeded, total };
  }
}
