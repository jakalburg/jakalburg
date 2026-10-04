import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSettingsService } from './notification-settings.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  paginate,
  parsePagination,
  type PaginatedResult,
} from '../common/pagination/pagination.util';

/** The order fields a notification needs. Structurally a subset of OrderEmailData. */
export interface OrderNotificationInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  total: number;
}

/** Default page size for the bell. Bounded so a long-ignored bell stays fast.
 *  The hard ceiling is MAX_PAGE_SIZE, enforced by `parsePagination`. */
const DEFAULT_LIMIT = 20;

/** Read notifications older than this are pruned. */
const PRUNE_AFTER_DAYS = 30;
/** …but at most this often, so the bell's polling can't turn into a delete storm. */
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** When the last prune ran. Process-local; a restart just means one more prune. */
  private lastPruneAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: NotificationSettingsService,
  ) {}

  // ---------------------------------------------------------------- reads

  /**
   * One filtered page of alerts, newest first.
   *
   * Also the natural place to prune, since it's the only method called on a
   * schedule — no cron needed, and nothing runs on a cold store.
   *
   * `unreadTotal` rides along on the envelope rather than living behind its
   * own endpoint: the admin needs it for the "Unread" filter's count on every
   * render, and folding it in here costs one more COUNT on a connection that
   * is already open, versus a second HTTP round trip to a free-tier database.
   * It ignores the active filters on purpose — it's "how much is outstanding
   * overall", which shouldn't change as you narrow the table.
   */
  async findAll(
    query: NotificationQueryDto = {},
  ): Promise<PaginatedResult<Notification> & { unreadTotal: number }> {
    void this.pruneIfDue();

    const params = parsePagination(query, DEFAULT_LIMIT);
    const where = this.buildWhere(query);

    const [data, total, unreadTotal] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    return { ...paginate(data, total, params), unreadTotal };
  }

  /** Translate the query params into a Prisma filter. */
  private buildWhere(query: NotificationQueryDto): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = {};

    if (query.status === 'unread') where.isRead = false;
    else if (query.status === 'read') where.isRead = true;

    if (query.type && query.type !== 'all') where.type = query.type;

    const search = query.search?.trim();
    if (search) {
      // Title and message are where the order number and customer name live,
      // so one term covers both ways an admin would look for an alert.
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Range is inclusive at both ends; either side can be given alone.
    const from = this.parseDate(query.from);
    const to = this.parseDate(query.to);
    if (from || to) {
      where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    }

    return where;
  }

  /** An ISO string to a Date, or undefined if it isn't a usable one. */
  private parseDate(value?: string): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  async markRead(id: string): Promise<Notification> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Notification "${id}" not found`);
    if (existing.isRead) return existing;
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(): Promise<{ success: true; updated: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updated: count };
  }

  // --------------------------------------------------------------- writes

  /**
   * Record an order event, if the admin has that alert switched on.
   *
   * NEVER throws. Every caller is on a path where the real work is already
   * done and committed — a failed bell entry must not surface as a failed
   * checkout or a failed status change.
   */
  async orderPlaced(order: OrderNotificationInput): Promise<void> {
    const { inAppOrderPlaced } = await this.settings.resolve();
    if (!inAppOrderPlaced) return;
    await this.write(
      'order_placed',
      `New order · ${order.orderNumber}`,
      `${order.customerName} placed an order for ${this.inr(order.total)}.`,
      `/orders/${order.orderId}`,
    );
  }

  async orderShipped(order: OrderNotificationInput): Promise<void> {
    const { inAppOrderShipped } = await this.settings.resolve();
    if (!inAppOrderShipped) return;
    await this.write(
      'order_shipped',
      `Order shipped · ${order.orderNumber}`,
      `${order.orderNumber} has been marked as shipped.`,
      `/orders/${order.orderId}`,
    );
  }

  async orderCancelled(order: OrderNotificationInput): Promise<void> {
    const { inAppOrderCancelled } = await this.settings.resolve();
    if (!inAppOrderCancelled) return;
    await this.write(
      'order_cancelled',
      `Order cancelled · ${order.orderNumber}`,
      `${order.orderNumber} (${this.inr(order.total)}) was cancelled.`,
      `/orders/${order.orderId}`,
    );
  }

  // -------------------------------------------------------------- internals

  private async write(
    type: string,
    title: string,
    message: string,
    link: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { type, title, message, link },
      });
    } catch (error) {
      this.logger.warn(
        `Could not record "${type}" notification: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  /**
   * Drop read notifications older than PRUNE_AFTER_DAYS, at most once an hour.
   * Unread rows are never pruned — an alert nobody has looked at is the one
   * thing here worth keeping. Fire-and-forget: pruning is housekeeping, and
   * failing at it must not fail the read that triggered it.
   */
  private async pruneIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPruneAt < PRUNE_INTERVAL_MS) return;
    this.lastPruneAt = now;

    const cutoff = new Date(now - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    try {
      const { count } = await this.prisma.notification.deleteMany({
        where: { isRead: true, createdAt: { lt: cutoff } },
      });
      if (count) this.logger.log(`Pruned ${count} read notification(s).`);
    } catch (error) {
      this.logger.warn(
        `Notification prune failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private inr(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }
}
