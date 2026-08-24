import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Customers = every non-admin User. An admin account (role "admin") is managed
// on the /admin-staff screen instead, so it is excluded here.
const CUSTOMER_WHERE = { role: { not: 'admin' } } satisfies Prisma.UserWhereInput;

type UserWithProfile = Prisma.UserGetPayload<{
  include: { profiles: true };
}>;

/**
 * CustomersService — read + delete for the admin Customers screen. A customer is
 * a User row (role != "admin"); the list adds aggregates (order count, lifetime
 * spend) the admin table/sheet display.
 *
 * SECURITY: routes are UNGUARDED for now, matching the product / fabric / admin
 * write routes (the admin uses a mock auth session, realApi sends no JWT). Add
 * JwtAuthGuard + RolesGuard('admin') before any non-local deployment.
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** List all customers, newest first, with order-count + total-spend aggregates. */
  async findAll() {
    const users = await this.prisma.user.findMany({
      where: CUSTOMER_WHERE,
      orderBy: { createdAt: 'desc' },
      include: {
        profiles: { orderBy: { createdAt: 'asc' }, take: 1 },
        _count: { select: { orders: true } },
      },
    });

    // One grouped query for lifetime spend, joined in memory by userId.
    const spend = await this.prisma.order.groupBy({
      by: ['userId'],
      _sum: { total: true },
    });
    const spentByUser = new Map(spend.map((s) => [s.userId, s._sum.total ?? 0]));

    return users.map((u) => ({
      id: u.id,
      name: this.displayName(u),
      email: u.email ?? '',
      phone: u.profiles[0]?.contactNo ?? null,
      image: u.image ?? null,
      totalOrders: u._count.orders,
      totalSpent: spentByUser.get(u.id) ?? 0,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  /** A single customer with embedded order history (for the detail sheet). */
  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...CUSTOMER_WHERE },
      include: {
        profiles: { orderBy: { createdAt: 'asc' }, take: 1 },
        orders: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      },
    });
    if (!user) throw new NotFoundException(`Customer "${id}" not found`);

    const totalSpent = user.orders.reduce((sum, o) => sum + o.total, 0);

    return {
      id: user.id,
      name: this.displayName(user),
      email: user.email ?? '',
      phone: user.profiles[0]?.contactNo ?? null,
      image: user.image ?? null,
      totalOrders: user.orders.length,
      totalSpent,
      createdAt: user.createdAt.toISOString(),
      orders: user.orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        // Admin order rows read `totalAmount`; our column is `total` (whole INR).
        totalAmount: o.total,
        items: o.items.map((i) => ({
          productId: i.productId,
          slug: i.slug,
          title: i.title,
          image: i.image,
          price: i.price,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          // Detail sheet reads items[0].product.name.
          product: { name: i.title },
        })),
        shippingAddress: o.shippingAddress,
      })),
    };
  }

  /** Delete a customer (cascades orders/profiles/accounts/cart via Prisma). */
  async remove(id: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.prisma.user.findFirst({
      where: { id, ...CUSTOMER_WHERE },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Customer "${id}" not found`);
    await this.prisma.user.delete({ where: { id } });
    return { success: true, id };
  }

  // ---- helpers --------------------------------------------------------------

  /** "First Last" from the profile, falling back to the email local part. */
  private displayName(user: UserWithProfile): string {
    const p = user.profiles[0];
    const full = [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    return user.email?.split('@')[0] ?? 'Customer';
  }
}
