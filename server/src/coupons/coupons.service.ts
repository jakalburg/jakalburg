import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Coupon, CouponDiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CouponResponseDto,
  CouponUsageResponseDto,
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponResponseDto,
} from './dto/coupon.dto';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

/** Discount a coupon resolves to for an order, priced server-side. */
export interface ResolvedCoupon {
  couponCode: string;
  discount: number;
}

/** An order joined to its owner + first profile — the shape findUsage loads. */
type OrderWithUser = Prisma.OrderGetPayload<{
  include: { user: { include: { profiles: true } } };
}>;

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- admin CRUD -----------------------------------------------------------

  async create(dto: CreateCouponDto): Promise<CouponResponseDto> {
    this.assertPercentageWithinBounds(dto.discountType, dto.discountAmount);
    try {
      const coupon = await this.prisma.coupon.create({
        data: this.toCreateData(dto),
      });
      return this.toResponse(coupon);
    } catch (err) {
      throw this.mapWriteError(err, dto.code);
    }
  }

  /** One page of coupons, newest first, searchable by code or title. */
  async findAll(
    query: PaginationQuery & { search?: string } = {},
  ): Promise<PaginatedResult<CouponResponseDto>> {
    const params = parsePagination(query);
    const where: Prisma.CouponWhereInput = {};

    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, coupons] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(
      coupons.map((c) => this.toResponse(c)),
      total,
      params,
    );
  }

  async findOne(id: string): Promise<CouponResponseDto> {
    return this.toResponse(await this.getOr404(id));
  }

  /**
   * The coupon plus every order that redeemed it, newest first.
   *
   * There is no per-redemption table — each Order denormalizes the applied code
   * into `couponCode` at checkout (resolveForOrder stores the coupon's already
   * UPPERCASE `code`), so usage is reconstructed by matching Orders on that code.
   * Each row carries the customer's display name (resolved from their profile
   * like CustomersService does, falling back to the email local-part).
   */
  async findUsage(id: string): Promise<CouponUsageResponseDto> {
    const coupon = await this.getOr404(id);
    const orders = await this.prisma.order.findMany({
      where: { couponCode: coupon.code },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          include: { profiles: { orderBy: { createdAt: 'asc' }, take: 1 } },
        },
      },
    });

    return {
      coupon: this.toResponse(coupon),
      usage: orders.map((order) => ({
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toISOString(),
        total: order.total,
        discount: order.discount,
        // Every Order has a required user relation, but guard anyway so a guest
        // order (should one ever exist) still keeps its row with user: null.
        user: order.user
          ? {
              id: order.user.id,
              name: this.userDisplayName(order.user),
              email: order.user.email ?? '',
            }
          : null,
      })),
    };
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponResponseDto> {
    const existing = await this.getOr404(id);
    // A partial edit may change only the type or only the amount — validate the
    // effective pair so the two can never drift into an invalid combination.
    this.assertPercentageWithinBounds(
      dto.discountType ?? existing.discountType,
      dto.discountAmount ?? existing.discountAmount,
    );
    try {
      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: this.toUpdateData(dto),
      });
      return this.toResponse(coupon);
    } catch (err) {
      throw this.mapWriteError(err, dto.code);
    }
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.getOr404(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true, id };
  }

  // ---- validation / redemption ---------------------------------------------

  /** Validate a code against a subtotal WITHOUT redeeming it (checkout preview).
   *  Returns a non-throwing result so the storefront can show a friendly reason. */
  async validate(
    rawCode: string,
    subtotal: number,
  ): Promise<ValidateCouponResponseDto> {
    const code = this.normalize(rawCode);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    const reason = coupon ? this.rejectionReason(coupon, subtotal) : 'Invalid coupon code.';
    if (!coupon || reason) {
      return { valid: false, message: reason ?? 'Invalid coupon code.', discountAmount: 0 };
    }
    return {
      valid: true,
      message: 'Coupon applied.',
      discountAmount: this.computeDiscount(coupon, subtotal),
      couponCode: coupon.code,
      discountType: coupon.discountType,
    };
  }

  /** Resolve the discount for an order line-up. Throws (400) on an invalid code
   *  so checkout fails loudly rather than silently dropping the discount. Returns
   *  null when no code was supplied. The client-sent discount is never trusted —
   *  the amount is always recomputed here from the live coupon. */
  async resolveForOrder(
    rawCode: string | undefined | null,
    subtotal: number,
  ): Promise<ResolvedCoupon | null> {
    if (!rawCode) return null;
    const code = this.normalize(rawCode);
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new BadRequestException('Invalid coupon code.');
    const reason = this.rejectionReason(coupon, subtotal);
    if (reason) throw new BadRequestException(reason);
    return { couponCode: coupon.code, discount: this.computeDiscount(coupon, subtotal) };
  }

  /** Increment a coupon's redemption count. Called inside the order transaction
   *  so a placed order and its coupon usage commit together. Best-effort on the
   *  usage cap (a rare race can nudge usageCount one past maxUsage). */
  async recordRedemption(
    tx: Prisma.TransactionClient,
    code: string,
  ): Promise<void> {
    await tx.coupon.updateMany({
      where: { code: this.normalize(code) },
      data: { usageCount: { increment: 1 } },
    });
  }

  // ---- helpers --------------------------------------------------------------

  /** Whole-INR discount for this coupon at the given subtotal, capped at subtotal. */
  private computeDiscount(coupon: Coupon, subtotal: number): number {
    const raw =
      coupon.discountType === CouponDiscountType.percentage
        ? Math.floor((subtotal * coupon.discountAmount) / 100)
        : coupon.discountAmount;
    return Math.max(0, Math.min(raw, subtotal));
  }

  /** Reject a percentage coupon whose amount exceeds 100% (would over-discount). */
  private assertPercentageWithinBounds(
    discountType: CouponDiscountType,
    discountAmount: number,
  ): void {
    if (
      discountType === CouponDiscountType.percentage &&
      discountAmount > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%.');
    }
  }

  /** Why this coupon can't apply, or null if it's valid for the subtotal. */
  private rejectionReason(coupon: Coupon, subtotal: number): string | null {
    if (!coupon.isActive) return 'This coupon is no longer active.';
    if (coupon.endDate && coupon.endDate.getTime() < this.now()) {
      return 'This coupon has expired.';
    }
    if (coupon.maxUsage != null && coupon.usageCount >= coupon.maxUsage) {
      return 'This coupon has reached its usage limit.';
    }
    if (subtotal < coupon.minimumAmount) {
      return `Add ₹${coupon.minimumAmount - subtotal} more to use this coupon (min ₹${coupon.minimumAmount}).`;
    }
    return null;
  }

  /** "First Last" from the order owner's first profile, falling back to the
   *  email local-part — mirrors CustomersService.displayName. */
  private userDisplayName(user: OrderWithUser['user']): string {
    const p = user.profiles[0];
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    return user.email?.split('@')[0] ?? 'Customer';
  }

  private normalize(code: string): string {
    return code.trim().toUpperCase();
  }

  private now(): number {
    return Date.now();
  }

  private async getOr404(id: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon "${id}" not found`);
    return coupon;
  }

  private toCreateData(dto: CreateCouponDto): Prisma.CouponCreateInput {
    return {
      code: this.normalize(dto.code),
      title: dto.title ?? null,
      discountType: dto.discountType,
      discountAmount: dto.discountAmount,
      minimumAmount: dto.minimumAmount ?? 0,
      productType: dto.productType ?? 'all',
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: dto.isActive ?? true,
      maxUsage: dto.maxUsage ?? null,
      logo: dto.logo ?? null,
    };
  }

  private toUpdateData(dto: UpdateCouponDto): Prisma.CouponUpdateInput {
    const data: Prisma.CouponUpdateInput = {};
    if (dto.code !== undefined) data.code = this.normalize(dto.code);
    if (dto.title !== undefined) data.title = dto.title || null;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountAmount !== undefined) data.discountAmount = dto.discountAmount;
    if (dto.minimumAmount !== undefined) data.minimumAmount = dto.minimumAmount;
    if (dto.productType !== undefined) data.productType = dto.productType || 'all';
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.maxUsage !== undefined) data.maxUsage = dto.maxUsage ?? null;
    if (dto.logo !== undefined) data.logo = dto.logo || null;
    return data;
  }

  /** Turn a duplicate-code write (P2002) into a clean 409. */
  private mapWriteError(err: unknown, code?: string): unknown {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new ConflictException(
        `A coupon with code "${(code ?? '').trim().toUpperCase()}" already exists.`,
      );
    }
    return err;
  }

  private toResponse(coupon: Coupon): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountAmount: coupon.discountAmount,
      minimumAmount: coupon.minimumAmount,
      productType: coupon.productType,
      endDate: coupon.endDate ? coupon.endDate.toISOString() : null,
      isActive: coupon.isActive,
      maxUsage: coupon.maxUsage,
      usageCount: coupon.usageCount,
      logo: coupon.logo,
      createdAt: coupon.createdAt.toISOString(),
      updatedAt: coupon.updatedAt.toISOString(),
    };
  }
}
