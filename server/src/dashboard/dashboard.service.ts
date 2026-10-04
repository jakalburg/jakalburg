import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto, SalesPointDto } from './dto/dashboard-response.dto';

/**
 * Which order statuses count as money earned. A cancelled / returned / refunded
 * order still exists (and still counts in `totalOrders`), but adding its total
 * to revenue would overstate the store's takings, so it is excluded here.
 */
const REVENUE_STATUSES: OrderStatus[] = [
  OrderStatus.processing,
  OrderStatus.shipped,
  OrderStatus.delivered,
];

const REVENUE_WHERE: Prisma.OrderWhereInput = {
  status: { in: REVENUE_STATUSES },
};

/** The trailing window the dashboard's "change" percentages compare. */
const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The store sells in India, so days and months are bucketed in IST — not UTC,
 *  where an 8pm order would land on the next day's bar. */
const STORE_TZ = 'Asia/Kolkata';

export type SalesPeriod = 'week' | 'month' | 'year';

/** YYYY-MM-DD for an instant, as seen in the store's timezone. */
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "4 Oct" — the daily bucket's axis label. */
const dayLabelFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: STORE_TZ,
  day: 'numeric',
  month: 'short',
});

/** "Oct 25" — the monthly bucket's axis label. */
const monthLabelFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: STORE_TZ,
  month: 'short',
  year: '2-digit',
});

/**
 * Percentage change from `previous` to `current`, rounded to a whole number.
 * With no previous activity there is no meaningful ratio, so growth from zero
 * reads as +100% and a flat zero reads as 0% instead of Infinity / NaN.
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The four headline tiles. Every figure is a live aggregate — one
   * `$transaction` so all ten counts see the same snapshot of the database and
   * the totals can't disagree with the deltas derived from them.
   */
  async getStats(): Promise<DashboardStatsDto> {
    const now = Date.now();
    const windowStart = new Date(now - WINDOW_DAYS * DAY_MS);
    const previousStart = new Date(now - 2 * WINDOW_DAYS * DAY_MS);

    const currentWindow = { gte: windowStart };
    const previousWindow = { gte: previousStart, lt: windowStart };
    const notAdmin: Prisma.UserWhereInput = { role: { not: 'admin' } };

    const [
      revenueTotal,
      revenueCurrent,
      revenuePrevious,
      ordersTotal,
      ordersCurrent,
      ordersPrevious,
      productsTotal,
      productsBefore,
      customersTotal,
      customersBefore,
    ] = await this.prisma.$transaction([
      this.prisma.order.aggregate({ _sum: { total: true }, where: REVENUE_WHERE }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { ...REVENUE_WHERE, createdAt: currentWindow },
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        where: { ...REVENUE_WHERE, createdAt: previousWindow },
      }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: currentWindow } }),
      this.prisma.order.count({ where: { createdAt: previousWindow } }),
      this.prisma.product.count(),
      // Cumulative metrics compare against the count as it stood 30 days ago.
      this.prisma.product.count({ where: { createdAt: { lt: windowStart } } }),
      this.prisma.user.count({ where: notAdmin }),
      this.prisma.user.count({
        where: { ...notAdmin, createdAt: { lt: windowStart } },
      }),
    ]);

    return {
      totalRevenue: revenueTotal._sum.total ?? 0,
      totalOrders: ordersTotal,
      totalProducts: productsTotal,
      totalCustomers: customersTotal,
      revenueChange: percentChange(
        revenueCurrent._sum.total ?? 0,
        revenuePrevious._sum.total ?? 0,
      ),
      ordersChange: percentChange(ordersCurrent, ordersPrevious),
      productsChange: percentChange(productsTotal, productsBefore),
      customersChange: percentChange(customersTotal, customersBefore),
    };
  }

  /**
   * Revenue + order counts over time, as a continuous series.
   *
   * Buckets are generated first and then filled, so a day with no orders is a
   * zero on the chart rather than a missing point — otherwise recharts joins
   * across the gap and a quiet week looks like a steady trickle.
   *
   * Only orders inside the window are read (id-free, two columns), so this stays
   * proportional to recent activity rather than to the size of the order table.
   */
  async getSales(period: SalesPeriod = 'month'): Promise<SalesPointDto[]> {
    const monthly = period === 'year';
    const { buckets, start } = monthly
      ? this.monthBuckets(12)
      : this.dayBuckets(period === 'week' ? 7 : 30);

    const orders = await this.prisma.order.findMany({
      where: { ...REVENUE_WHERE, createdAt: { gte: start } },
      select: { createdAt: true, total: true },
    });

    const series = new Map(
      buckets.map((b) => [b.key, { name: b.label, revenue: 0, orders: 0 }]),
    );

    for (const order of orders) {
      const key = monthly
        ? dayKeyFmt.format(order.createdAt).slice(0, 7) // YYYY-MM
        : dayKeyFmt.format(order.createdAt); // YYYY-MM-DD
      const point = series.get(key);
      // Nothing should fall outside the buckets, but an order written in the
      // same millisecond the window rolls over would — skip it rather than
      // inventing a bucket the chart doesn't have an axis slot for.
      if (!point) continue;
      point.revenue += order.total;
      point.orders += 1;
    }

    return [...series.values()];
  }

  // ---- bucket generation ----------------------------------------------------
  // Each helper returns the buckets (oldest first) AND the instant the oldest
  // one opens, which is what the query filters on.

  /** The last `count` days, keyed YYYY-MM-DD and labelled in store time. */
  private dayBuckets(count: number) {
    const now = Date.now();
    const buckets = Array.from({ length: count }, (_, i) => {
      const at = new Date(now - (count - 1 - i) * DAY_MS);
      return { key: dayKeyFmt.format(at), label: dayLabelFmt.format(at) };
    });
    return { buckets, start: this.storeMidnight(buckets[0].key) };
  }

  /** The last `count` calendar months, keyed YYYY-MM. */
  private monthBuckets(count: number) {
    // Anchor on the store-time year/month so a late-night UTC rollover can't
    // shift the whole series by a month.
    const [year, month] = dayKeyFmt.format(new Date()).split('-').map(Number);
    const buckets = Array.from({ length: count }, (_, i) => {
      // Date.UTC normalises the month overflow, so month-1-offset going
      // negative rolls the year back on its own.
      const at = new Date(Date.UTC(year, month - 1 - (count - 1 - i), 1));
      const key = `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, '0')}`;
      return { key, label: monthLabelFmt.format(at) };
    });
    return { buckets, start: this.storeMidnight(`${buckets[0].key}-01`) };
  }

  /** Midnight store time on a YYYY-MM-DD key, as the equivalent UTC instant. */
  private storeMidnight(dayKey: string): Date {
    const [year, month, day] = dayKey.split('-').map(Number);
    // IST is UTC+5:30 and has no DST, so local midnight is 18:30 UTC the day before.
    return new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000);
  }
}
