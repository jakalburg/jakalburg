import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto, UpdateContactStatusDto } from './dto/contact.dto';

/**
 * ContactService — storefront contact + newsletter submissions.
 *
 * `create` is fed by the public storefront forms; the rest back the admin
 * Contact inbox (list by type, mark read/unread, delete). See Contact.prisma
 * for the one-table-two-types shape.
 */
@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  /** Store a submission from the storefront. Newsletter rows carry only email. */
  create(dto: CreateContactDto) {
    return this.prisma.contact.create({
      data: {
        type: dto.type,
        email: dto.email,
        // Newsletter signups send none of these; keep them null rather than "".
        name: dto.name?.trim() || null,
        subject: dto.subject?.trim() || null,
        message: dto.message?.trim() || null,
      },
    });
  }

  /** One inbox: every submission of a given `type`, newest-first. */
  findAll(type?: string) {
    const where: Prisma.ContactWhereInput = {};
    if (type) where.type = type;
    return this.prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contact submission "${id}" not found`);
    }
    return contact;
  }

  async updateStatus(id: string, dto: UpdateContactStatusDto) {
    await this.findOne(id); // 404 if it's gone
    return this.prisma.contact.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.contact.delete({ where: { id } });
    return { success: true, id };
  }
}
