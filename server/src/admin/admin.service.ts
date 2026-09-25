import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { BCRYPT_SALT_ROUNDS } from '../common/constants/auth.constant';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import {
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

const ADMIN_ROLE = 'admin';

// Safe projection for every response — NEVER exposes `password` / `tokenVersion`.
// Shape matches what the admin UI reads: { id, email, role, profiles:[{...}] }.
const adminSelect = {
  id: true,
  email: true,
  role: true,
  disabled: true,
  createdAt: true,
  updatedAt: true,
  profiles: {
    select: { id: true, firstName: true, lastName: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.UserSelect;

/**
 * AdminService — CRUD for administrator ("staff") accounts, backing the admin
 * app's /admin-staff pages. An admin is just a User row with role = "admin";
 * created accounts are email-verified immediately so they can sign in via
 * /auth/login-password right away.
 *
 * SECURITY: the controller routes are UNGUARDED for now, matching the product /
 * fabric write routes (the admin still uses a mock auth session, and realApi
 * sends no JWT yet). These endpoints create privileged accounts, so they MUST
 * gain JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 */
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** One page of admins, newest first, searchable by name or email. */
  async findAll(query: PaginationQuery & { search?: string } = {}) {
    const params = parsePagination(query);
    const where: Prisma.UserWhereInput = { role: ADMIN_ROLE };

    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        {
          profiles: {
            some: {
              OR: [
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: adminSelect,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(data, total, params);
  }

  /** Fetch a single admin by id (404 if the id isn't an admin). */
  async findOne(id: string) {
    const admin = await this.prisma.user.findFirst({
      where: { id, role: ADMIN_ROLE },
      select: adminSelect,
    });
    if (!admin) throw new NotFoundException(`Admin "${id}" not found`);
    return admin;
  }

  /** Create a new admin account (email-verified, email/password provider). */
  async create(dto: CreateAdminDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'An account with this email already exists.',
      );
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    return this.prisma.user.create({
      data: {
        email,
        password,
        role: ADMIN_ROLE,
        // Trusted on creation — no OTP round-trip; they can log in immediately.
        emailVerified: new Date(),
        providers: ['email'],
        profiles: {
          create: { firstName: dto.firstName.trim(), lastName: dto.lastName.trim() },
        },
        accounts: {
          create: {
            type: 'credentials',
            provider: 'email',
            providerAccountId: email,
          },
        },
      },
      select: adminSelect,
    });
  }

  /** Update an admin's name / email / password (all optional). */
  async update(id: string, dto: UpdateAdminDto) {
    const existing = await this.prisma.user.findFirst({
      where: { id, role: ADMIN_ROLE },
      include: { profiles: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!existing) throw new NotFoundException(`Admin "${id}" not found`);

    const data: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== existing.email) {
        const clash = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException(
            'An account with this email already exists.',
          );
        }
        data.email = email;
      }
    }

    // Blank password means "keep current" — the edit form omits it entirely.
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
      // Invalidate any sessions issued before the password changed.
      data.tokenVersion = { increment: 1 };
    }

    const profileData: { firstName?: string; lastName?: string } = {};
    if (dto.firstName !== undefined) profileData.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) profileData.lastName = dto.lastName.trim();
    if (Object.keys(profileData).length > 0) {
      const profile = existing.profiles[0];
      data.profiles = profile
        ? { update: { where: { id: profile.id }, data: profileData } }
        : { create: profileData };
    }

    await this.prisma.user.update({ where: { id }, data });
    return this.findOne(id);
  }

  /** Delete an admin. Refuses to remove the last remaining admin (lock-out). */
  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { id, role: ADMIN_ROLE },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Admin "${id}" not found`);

    const adminCount = await this.prisma.user.count({
      where: { role: ADMIN_ROLE },
    });
    if (adminCount <= 1) {
      throw new BadRequestException('Cannot delete the last remaining admin.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true, id };
  }
}
