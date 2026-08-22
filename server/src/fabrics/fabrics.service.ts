import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Fabric, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';

/**
 * FabricsService — CRUD for the curated fabric list. Mirrors the products
 * service's slug/uniqueness helpers. Products keep storing fabric as a plain
 * string; this is the managed set the admin picks from or adds to.
 *
 * NOTE: write routes are UNGUARDED for now (see the controller). Protect with
 * JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 */
@Injectable()
export class FabricsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Fabric[]> {
    return this.prisma.fabric.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateFabricDto): Promise<Fabric> {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Fabric name is required');
    const slug = await this.uniqueSlug(name);
    try {
      return await this.prisma.fabric.create({
        data: { name, slug, description: dto.description?.trim() || null },
      });
    } catch (e) {
      throw this.rethrowDuplicate(e, name);
    }
  }

  async update(id: string, dto: UpdateFabricDto): Promise<Fabric> {
    const existing = await this.prisma.fabric.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Fabric "${id}" not found`);

    const data: Prisma.FabricUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException('Fabric name cannot be empty');
      data.name = name;
      // Re-slug only when the name actually changed.
      if (this.slugify(name) !== existing.slug) {
        data.slug = await this.uniqueSlug(name);
      }
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    try {
      return await this.prisma.fabric.update({ where: { id }, data });
    } catch (e) {
      throw this.rethrowDuplicate(e, dto.name ?? existing.name);
    }
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.fabric.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Fabric "${id}" not found`);
    await this.prisma.fabric.delete({ where: { id } });
    return { success: true, id };
  }

  // ---- helpers --------------------------------------------------------------

  /** Turn a Prisma unique-constraint violation into a friendly 400. */
  private rethrowDuplicate(e: unknown, name: string): Error {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new BadRequestException(`A fabric named "${name}" already exists`);
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
    const root = this.slugify(base) || 'fabric';
    let candidate = root;
    let n = 2;
    while (await this.prisma.fabric.findUnique({ where: { slug: candidate } })) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }
}
