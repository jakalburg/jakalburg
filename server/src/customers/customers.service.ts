import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

const ADMIN_ROLE = 'admin';

// Customers = every non-admin User. An admin account (role "admin") is managed
// on the /admin-staff screen instead, so it is excluded here.
const CUSTOMER_WHERE = {
  role: { not: ADMIN_ROLE },
} satisfies Prisma.UserWhereInput;

/** Orders embedded in the customer detail sheet before "load more" kicks in. */
const RECENT_ORDERS_PAGE_SIZE = 10;

/** Sort keys the admin Customers table offers → their ORDER BY clause.
 *  Every clause ends with a tiebreaker so paging can't repeat or skip a row
 *  when two customers share a name / order count / spend. */
const CUSTOMER_SORTS: Record<string, Prisma.Sql> = {
  'name-asc': Prisma.sql`p."firstName" ASC NULLS LAST, p."lastName" ASC NULLS LAST, u."id" ASC`,
  'name-desc': Prisma.sql`p."firstName" DESC NULLS LAST, p."lastName" DESC NULLS LAST, u."id" ASC`,
  'orders-desc': Prisma.sql`o."orderCount" DESC, u."id" ASC`,
  'spent-desc': Prisma.sql`o."totalSpent" DESC, u."id" ASC`,
  'joined-desc': Prisma.sql`u."createdAt" DESC, u."id" ASC`,
  default: Prisma.sql`u."createdAt" DESC, u."id" ASC`,
};

export interface CustomerListQuery extends PaginationQuery {
  search?: string;
  /** One of the CUSTOMER_SORTS keys; anything else falls back to newest-first. */
  sort?: string;
  /**
   * What `search` matches against. 'name' restricts it to the customer's
   * display name (first / last / full) — used by the review-author picker, which
   * searches people by name only. Anything else (the default) also matches email
   * and phone, the way the Customers table does.
   */
  searchBy?: string;
}

/** A row as the raw customer-list query returns it. */
interface CustomerRow {
  id: string;
  email: string | null;
  image: string | null;
  createdAt: Date;
  firstName: string | null;
  lastName: string | null;
  contactNo: string | null;
  orderCount: number;
  totalSpent: number;
}

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

  /**
   * One page of customers with order-count + lifetime-spend aggregates,
   * free-text search over name / email / phone, and sorting.
   *
   * Raw SQL rather than the query builder: the admin table sorts by display
   * name (which lives on the related Profile) and by lifetime spend (a SUM over
   * Order), and Prisma can order by neither. Doing it here keeps every sort
   * correct across pages instead of only re-ordering the rows already fetched.
   */
  async findAll(query: CustomerListQuery = {}) {
    const params = parsePagination(query);

    // Newest-first is the default and the only sort with a supporting index.
    const orderBy = CUSTOMER_SORTS[query.sort ?? ''] ?? CUSTOMER_SORTS.default;

    const term = query.search?.trim();
    const search = term ? `%${term}%` : null;
    const nameOnly = query.searchBy === 'name';
    // Postgres treats `x ILIKE NULL` as NULL (never true), so either predicate
    // collapses to "no filter" when nothing was searched for. Name-only drops
    // the email / phone clauses so the author picker matches people by name.
    const searchPredicate = nameOnly
      ? Prisma.sql`
        ${search}::text IS NULL
        OR p."firstName" ILIKE ${search}
        OR p."lastName" ILIKE ${search}
        OR COALESCE(p."firstName" || ' ' || p."lastName", '') ILIKE ${search}`
      : Prisma.sql`
        ${search}::text IS NULL
        OR u."email" ILIKE ${search}
        OR p."firstName" ILIKE ${search}
        OR p."lastName" ILIKE ${search}
        OR p."contactNo" ILIKE ${search}
        OR COALESCE(p."firstName" || ' ' || p."lastName", '') ILIKE ${search}`;
    const filter = Prisma.sql`
      u."role" <> ${ADMIN_ROLE}
      AND (
        ${searchPredicate}
      )`;

    // The customer's first profile, picked per row.
    const profileJoin = Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT "firstName", "lastName", "contactNo"
        FROM "Profile"
        WHERE "userId" = u."id"
        ORDER BY "createdAt" ASC
        LIMIT 1
      ) p ON TRUE`;

    // Per-customer order count + spend, aggregated once rather than per row.
    const spendJoin = Prisma.sql`
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS "orderCount",
               COALESCE(SUM("total"), 0)::int AS "totalSpent"
        FROM "Order"
        WHERE "userId" = u."id"
      ) o ON TRUE`;

    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<CustomerRow[]>`
        SELECT u."id",
               u."email",
               u."image",
               u."createdAt",
               p."firstName",
               p."lastName",
               p."contactNo",
               o."orderCount",
               o."totalSpent"
        FROM "User" u
        ${profileJoin}
        ${spendJoin}
        WHERE ${filter}
        ORDER BY ${orderBy}
        LIMIT ${params.take} OFFSET ${params.skip}`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        ${profileJoin}
        WHERE ${filter}`,
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    const data = rows.map((r) => ({
      id: r.id,
      name: this.rowDisplayName(r),
      email: r.email ?? '',
      phone: r.contactNo ?? null,
      image: r.image ?? null,
      totalOrders: r.orderCount,
      totalSpent: r.totalSpent,
      createdAt: r.createdAt.toISOString(),
    }));

    return paginate(data, total, params);
  }

  /**
   * A single customer with their most recent orders (for the detail sheet).
   *
   * The embedded order list is capped — a long-standing customer shouldn't drag
   * their entire history into a sheet that only shows the latest few. The
   * counts/spend below come from aggregates, so they stay accurate regardless.
   */
  async findOne(id: string, query: PaginationQuery = {}) {
    const params = parsePagination(query, RECENT_ORDERS_PAGE_SIZE);

    const user = await this.prisma.user.findFirst({
      where: { id, ...CUSTOMER_WHERE },
      include: {
        profiles: { orderBy: { createdAt: 'asc' }, take: 1 },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
          skip: params.skip,
          take: params.take,
        },
        _count: { select: { orders: true } },
      },
    });
    if (!user) throw new NotFoundException(`Customer "${id}" not found`);

    // Lifetime spend over ALL orders, not just the page we embedded.
    const spend = await this.prisma.order.aggregate({
      where: { userId: id },
      _sum: { total: true },
    });
    const totalSpent = spend._sum.total ?? 0;
    const totalOrders = user._count.orders;

    return {
      id: user.id,
      name: this.displayName(user),
      email: user.email ?? '',
      phone: user.profiles[0]?.contactNo ?? null,
      image: user.image ?? null,
      totalOrders,
      totalSpent,
      createdAt: user.createdAt.toISOString(),
      /** Whether more orders exist beyond the embedded page. */
      hasMoreOrders: params.skip + user.orders.length < totalOrders,
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
    return this.formatName(p?.firstName, p?.lastName, user.email);
  }

  /** Same rule for a raw list row, which carries the profile fields inline. */
  private rowDisplayName(row: CustomerRow): string {
    return this.formatName(row.firstName, row.lastName, row.email);
  }

  private formatName(
    firstName?: string | null,
    lastName?: string | null,
    email?: string | null,
  ): string {
    const full = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (full) return full;
    return email?.split('@')[0] ?? 'Customer';
  }
}
