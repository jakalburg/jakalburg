import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Order, OrderItem, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddressDto } from '../common/dto/address.dto';
import { CouponsService } from '../coupons/coupons.service';
import { EmailService, OrderEmailData } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationSettingsService } from '../notifications/notification-settings.service';
import { SheetsService } from '../sheets/sheets.service';
import {
  CreateOrderDto,
  OrderItemResponseDto,
  OrderResponseDto,
} from './dto/order.dto';
import {
  PaginatedResult,
  PaginationQuery,
  paginate,
  parsePagination,
} from '../common/pagination';

type OrderWithItems = Order & { items: OrderItem[] };

/**
 * A Razorpay payment the server has already proved: signature checked, the
 * payment read back from Razorpay, and the captured amount matched against the
 * order total. Only OrdersController.verifyRazorpay constructs one — nothing
 * accepts these fields straight off a request body.
 */
export interface VerifiedPayment {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  razorpayMethod?: string;
}

const INCLUDE_ITEMS = { items: true } satisfies Prisma.OrderInclude;
const MAX_ORDER_NUMBER_ATTEMPTS = 5;

// Admin reads pull the owning user + their first profile so the orders screen
// can show a real customer name/email alongside the frozen shipping snapshot.
const ADMIN_INCLUDE = {
  items: true,
  user: { include: { profiles: { orderBy: { createdAt: 'asc' }, take: 1 } } },
} satisfies Prisma.OrderInclude;

type AdminOrder = Prisma.OrderGetPayload<{ include: typeof ADMIN_INCLUDE }>;

// The admin UI offers a rich status vocabulary (pending/confirmed/
// out_for_delivery/rejected/rto_received/…) that doesn't map 1:1 onto the lean
// store's enum. Every admin label is folded onto the nearest storable state so
// no status choice is rejected: the synonyms collapse (pending/confirmed →
// processing, out_for_delivery → shipped, rejected → cancelled, rto_received →
// returned) and the terminal states are stored as-is.
const ADMIN_STATUS_TO_ENUM: Record<string, OrderStatus> = {
  pending: OrderStatus.processing,
  confirmed: OrderStatus.processing,
  processing: OrderStatus.processing,
  shipped: OrderStatus.shipped,
  out_for_delivery: OrderStatus.shipped,
  delivered: OrderStatus.delivered,
  cancelled: OrderStatus.cancelled,
  // "rejected" is how the admin labels a refused order — the same terminal state.
  rejected: OrderStatus.cancelled,
  returned: OrderStatus.returned,
  // "return to origin received" is the courier-side end of a return.
  rto_received: OrderStatus.returned,
  refunded: OrderStatus.refunded,
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    private readonly email: EmailService,
    private readonly sheets: SheetsService,
    private readonly notifications: NotificationsService,
    private readonly notificationPrefs: NotificationSettingsService,
  ) {}

  /**
   * The order already written for this Razorpay payment, if any.
   *
   * Razorpay's browser checkout can fire its success handler more than once
   * (a retried request, a double-click, a reopened tab), and `verifyRazorpay`
   * is a plain POST with no other guard. Without this lookup the second call
   * would write a second order for one payment. `razorpayPaymentId` is unique
   * in the schema, so the database refuses the duplicate even if two callbacks
   * race past this check at the same moment.
   */
  async findByRazorpayPaymentId(
    razorpayPaymentId: string,
  ): Promise<OrderResponseDto | null> {
    const existing = await this.prisma.order.findUnique({
      where: { razorpayPaymentId },
      include: INCLUDE_ITEMS,
    });
    return existing ? this.toResponse(existing) : null;
  }

  /**
   * Price an order from the LIVE products — never from the client.
   *
   * Shared by `create()` and by the Razorpay flow, which has to know what to
   * charge before any order exists. Both calling it is the point: the amount
   * the customer is asked to pay and the amount later written to the order are
   * produced by the same code, so they cannot drift.
   *
   * Throws 400 if a product vanished or the coupon no longer applies.
   */
  async priceOrder(dto: CreateOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, title: true, images: true, price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Some products are no longer available: ${missing.join(', ')}`,
      );
    }

    const items = dto.items.map((line) => {
      const p = byId.get(line.productId)!;
      return {
        productId: p.id,
        slug: p.slug,
        title: p.title,
        image: p.images[0] ?? '',
        price: p.price,
        size: line.size,
        color: line.color,
        quantity: Math.max(1, line.quantity),
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = dto.shipping;
    // The discount is ALWAYS recomputed server-side from the coupon (the
    // client-sent `discount` is ignored) so totals can't be tampered with.
    // An invalid/expired/under-minimum code throws 400 here.
    const applied = await this.coupons.resolveForOrder(dto.couponCode, subtotal);
    const discount = applied?.discount ?? 0;
    const couponCode = applied?.couponCode ?? null;
    const total = Math.max(0, subtotal + shipping - discount);

    return { items, subtotal, shipping, discount, couponCode, total, applied };
  }

  /** Create an order from the given lines. Prices/snapshots come from the LIVE
   *  products (never the client) so totals can't be tampered with. The user's
   *  cart is cleared in the same transaction.
   *
   *  `payment` carries the verified Razorpay details when the order was paid
   *  online; omitted for COD. */
  async create(
    userId: string,
    dto: CreateOrderDto,
    payment?: VerifiedPayment,
  ): Promise<OrderResponseDto> {
    const { items, subtotal, shipping, discount, couponCode, total, applied } =
      await this.priceOrder(dto);

    // Frozen snapshot of the shipping address (independent of later edits).
    const shippingAddress = { ...dto.address } as Prisma.InputJsonValue;

    const order = await this.createWithUniqueNumber((orderNumber) =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            orderNumber,
            userId,
            subtotal,
            shipping,
            discount,
            couponCode,
            total,
            email: dto.email,
            paymentLabel: dto.paymentLabel,
            shippingAddress,
            items: { create: items },
            // A verified online payment, or COD awaiting collection.
            paymentMethod: payment ? 'razorpay' : 'cod',
            paymentStatus: payment ? 'paid' : 'cod_pending',
            ...(payment
              ? {
                  razorpayOrderId: payment.razorpayOrderId,
                  razorpayPaymentId: payment.razorpayPaymentId,
                  razorpaySignature: payment.razorpaySignature,
                  razorpayMethod: payment.razorpayMethod,
                }
              : {}),
          },
          include: INCLUDE_ITEMS,
        });

        // Count the redemption in the same transaction as the order.
        if (applied) {
          await this.coupons.recordRedemption(tx, applied.couponCode);
        }

        // Emptied on checkout — the cart's job is done.
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        return created;
      }),
    );

    // Fire the confirmation (customer) + new-order (owner) emails, raise the
    // admin's bell alert, and mirror the order into the owner's Google Sheet.
    // All of them swallow their own failures and never throw, so flaky SMTP or
    // a Google outage can't break checkout — the order is already committed
    // either way. Awaited rather than left dangling because the serverless
    // function can freeze the moment this response is returned, dropping any
    // still-pending work.
    //
    // The CUSTOMER's confirmation is not gated by any preference: it is the
    // receipt for a purchase they just made, not a notification the shop opts
    // into. Only the owner's copy answers to Settings → Notifications.
    const emailData = this.toOrderEmailData(order);
    const prefs = await this.notificationPrefs.resolve();
    await Promise.all([
      this.email.sendOrderPlacedCustomerEmail(emailData),
      prefs.emailOrderPlaced
        ? this.email.sendOrderPlacedOwnerEmail(emailData)
        : Promise.resolve(false),
      this.notifications.orderPlaced(emailData),
      this.sheets.syncOrder(order),
    ]).catch(() => undefined);

    return this.toResponse(order);
  }

  /** The user's order history, newest first, one page at a time. */
  async findMine(
    userId: string,
    query: PaginationQuery = {},
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const params = parsePagination(query);
    const where: Prisma.OrderWhereInput = { userId };

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: INCLUDE_ITEMS,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
    ]);

    return paginate(
      orders.map((o) => this.toResponse(o)),
      total,
      params,
    );
  }

  /** A single order by its public number, scoped to the owner (404 otherwise so
   *  we never reveal another user's order exists). */
  async findOne(userId: string, orderNumber: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: INCLUDE_ITEMS,
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order "${orderNumber}" not found`);
    }
    return this.toResponse(order);
  }

  /** Retry create with a fresh "JB-######" number on unique-collision (P2002). */
  private async createWithUniqueNumber(
    run: (orderNumber: string) => Promise<OrderWithItems>,
  ): Promise<OrderWithItems> {
    for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
      try {
        return await run(`JB-${randomInt(100000, 1000000)}`);
      } catch (err) {
        const collision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          attempt < MAX_ORDER_NUMBER_ATTEMPTS;
        if (!collision) throw err;
      }
    }
    // Unreachable: the loop either returns or throws on the final attempt.
    throw new Error('Could not generate a unique order number');
  }

  // ---- admin (orders screen) ------------------------------------------------
  //
  // These power the admin `/logistics?tab=orders` list + the order detail page.
  // They are exposed through an UNGUARDED controller for local dev (see
  // OrdersAdminController). Add JwtAuthGuard + RolesGuard('admin') before deploy.

  /**
   * One page of orders for the admin table, newest first (or by the requested
   * sort), with search + status filtering done in the database.
   */
  async adminFindAll(
    params: PaginationQuery & {
      status?: string;
      search?: string;
      sort?: string;
    },
  ) {
    // Default 10/page, hard-capped at 100 — the admin table used to pull 500.
    const pagination = parsePagination(params);

    const where: Prisma.OrderWhereInput = {};
    const status = params.status?.toLowerCase();
    if (status && status !== 'all' && this.isStorableStatus(status)) {
      where.status = ADMIN_STATUS_TO_ENUM[status];
    }

    // Free-text over the order number, the customer's email and their name —
    // the three columns the admin table actually shows.
    const term = params.search?.trim();
    if (term) {
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { user: { email: { contains: term, mode: 'insensitive' } } },
        {
          user: {
            profiles: {
              some: {
                OR: [
                  { firstName: { contains: term, mode: 'insensitive' } },
                  { lastName: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: this.resolveAdminSort(params.sort),
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.order.count({ where }),
    ]);

    const page = paginate(
      rows.map((r) => this.toAdminRow(r)),
      total,
      pagination,
    );
    // `items` is what the admin orders table has always read; `data` is the
    // shared envelope's name. Both point at the same array.
    return { ...page, items: page.data };
  }

  /** Sort orders by the keys the admin table offers. */
  private resolveAdminSort(sort?: string): Prisma.OrderOrderByWithRelationInput {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'total-asc':
        return { total: 'asc' };
      case 'total-desc':
        return { total: 'desc' };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  /** One order (by internal id) with the fuller detail-page shape. */
  async adminFindOne(id: string) {
    return this.toAdminDetail(await this.getAdminOrderOr404(id));
  }

  /** Set an order's status. When `notify` is set and the status actually
   *  changed, email the customer a status-update notice (`emailSent` reflects
   *  whether that send succeeded). A no-op change never emails. */
  async adminUpdateStatus(id: string, rawStatus: string, notify = false) {
    const order = await this.getAdminOrderOr404(id);
    const key = String(rawStatus || '').toLowerCase();
    const mapped = this.mapAdminStatus(rawStatus); // validates; throws on unknown

    // "Changed" is judged on the GRANULAR label the admin picks, not the lean
    // enum — otherwise switching shipped → out_for_delivery (both stored as
    // `shipped`) would read as a no-op and the choice would never stick.
    const previousLabel = order.adminStatus ?? order.status;
    const statusChanged = previousLabel !== key;
    // The customer email only makes sense when the customer-facing enum moves;
    // a purely granular change (e.g. shipped → out_for_delivery) shouldn't re-mail.
    const enumChanged = order.status !== mapped;

    if (statusChanged || enumChanged) {
      await this.prisma.order.update({
        where: { id },
        data: { status: mapped, adminStatus: key },
      });
      // Push the new status (and the Dispatched checkbox that follows from it)
      // to the sheet. Only on a real change — a no-op re-save shouldn't churn
      // the row or reset its sync state.
      await this.sheets.syncOrderById(id);
    }
    const emailData = this.toOrderEmailData(order);

    // Bell alert only when the customer-facing status actually moved — a
    // purely granular relabel (shipped → out_for_delivery) isn't a new event.
    if (enumChanged) await this.notifyStatusChange(emailData, mapped);

    // TWO independent gates on the customer email, and both must be open: the
    // per-order "Notify customer" checkbox the admin just ticked, and the
    // store-wide toggle for this status. `emailBlockedByPreference` is
    // reported back so the UI can say why a ticked box sent nothing, rather
    // than leaving the admin to assume the mail went out.
    let emailSent = false;
    let emailBlockedByPreference = false;
    if (notify && enumChanged) {
      if (await this.statusEmailAllowed(mapped)) {
        emailSent = await this.email.sendOrderStatusUpdateEmail(
          emailData,
          mapped,
        );
      } else {
        emailBlockedByPreference = true;
      }
    }
    return { success: true, statusChanged, emailSent, emailBlockedByPreference };
  }

  /**
   * Whether Settings → Notifications allows a status email for `status`.
   * Only `shipped` and `cancelled` have a toggle; for every other status the
   * per-order checkbox alone decides.
   */
  private async statusEmailAllowed(status: OrderStatus): Promise<boolean> {
    const prefs = await this.notificationPrefs.resolve();
    if (status === OrderStatus.shipped) return prefs.emailOrderShipped;
    if (status === OrderStatus.cancelled) return prefs.emailOrderCancelled;
    return true;
  }

  /** Bell alert for the two transitions the admin can subscribe to. */
  private async notifyStatusChange(
    order: OrderEmailData,
    status: OrderStatus,
  ): Promise<void> {
    if (status === OrderStatus.shipped) {
      await this.notifications.orderShipped(order);
    } else if (status === OrderStatus.cancelled) {
      await this.notifications.orderCancelled(order);
    }
  }

  /** Accept an order (→ processing). */
  async adminConfirm(id: string) {
    await this.getAdminOrderOr404(id);
    await this.prisma.order.update({
      where: { id },
      // Keep the granular label in step so the badge reads "Confirmed", not the
      // collapsed "Processing".
      data: { status: OrderStatus.processing, adminStatus: 'confirmed' },
    });
    await this.sheets.syncOrderById(id);
    return { success: true };
  }

  /** Reject an order → the terminal `cancelled` state (rejected and cancelled are
   *  the same outcome in this store). The reason isn't persisted (no column). */
  async adminReject(id: string, _reason?: string) {
    const order = await this.getAdminOrderOr404(id);
    const wasCancelled = order.status === OrderStatus.cancelled;
    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.cancelled, adminStatus: 'rejected' },
    });
    await this.sheets.syncOrderById(id);
    // Only on a real transition — re-rejecting an already-cancelled order
    // shouldn't ring the bell twice.
    if (!wasCancelled) {
      await this.notifications.orderCancelled(this.toOrderEmailData(order));
    }
    return { success: true };
  }

  /** Mark an order shipped. Tracking/courier details can't be persisted (no
   *  columns on the lean model), so only the status transition is stored. */
  async adminShip(id: string, _tracking?: unknown) {
    const order = await this.getAdminOrderOr404(id);
    const wasShipped = order.status === OrderStatus.shipped;
    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.shipped, adminStatus: 'shipped' },
    });
    await this.sheets.syncOrderById(id);
    if (!wasShipped) {
      await this.notifications.orderShipped(this.toOrderEmailData(order));
    }
    return { success: true };
  }

  /** Permanently delete an order (its items cascade). The sheet row goes with
   *  it unless `removeFromSheet` is explicitly false — the admin's delete
   *  dialog offers that as a checkbox, for keeping a paper trail of an order
   *  that no longer exists in the database.
   *
   *  The row is removed BEFORE the order, while the id is still resolvable; a
   *  failure there is reported back (`sheetRemovalError`) but never blocks the
   *  delete, so an order can always be removed even when Sheets is unreachable. */
  async adminRemove(
    id: string,
    removeFromSheet = true,
  ): Promise<{
    success: boolean;
    id: string;
    sheetRemoved: boolean;
    sheetRemovalError?: string;
  }> {
    await this.getAdminOrderOr404(id);

    let sheetRemoved = false;
    let sheetRemovalError: string | undefined;

    if (removeFromSheet && this.sheets.isConfigured) {
      const result = await this.sheets.removeOrder(id);
      sheetRemoved = result.success;
      if (!result.success) sheetRemovalError = result.message;
    }

    await this.prisma.order.delete({ where: { id } });

    return { success: true, id, sheetRemoved, sheetRemovalError };
  }

  /** Manually (re-)sync one order to the sheet — the admin's "Add to Sheet"
   *  button. Returns the attempt's outcome rather than throwing, so a failure
   *  renders as a message on the page instead of a 500. */
  async adminSyncSheet(id: string) {
    await this.getAdminOrderOr404(id);
    return this.sheets.syncOrderById(id);
  }

  // ---- admin helpers --------------------------------------------------------

  private async getAdminOrderOr404(id: string): Promise<AdminOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ADMIN_INCLUDE,
    });
    if (!order) throw new NotFoundException(`Order "${id}" not found`);
    return order;
  }

  private isStorableStatus(status: string): boolean {
    return Object.prototype.hasOwnProperty.call(ADMIN_STATUS_TO_ENUM, status);
  }

  private mapAdminStatus(rawStatus: string): OrderStatus {
    const key = String(rawStatus || '').toLowerCase();
    const mapped = ADMIN_STATUS_TO_ENUM[key];
    if (!mapped) {
      throw new BadRequestException(
        `Status "${rawStatus}" is not supported by this store (allowed: processing, shipped, delivered, cancelled, returned, refunded).`,
      );
    }
    return mapped;
  }

  /** The frozen shipping snapshot stores {fullName, line1, pincode, phone, …};
   *  the admin UI reads a richer field set (firstName/lastName, addressLine1,
   *  zipCode, contactNo, …). Expose both naming conventions so names/addresses
   *  render on every admin surface. */
  private adaptAddress(raw: unknown, fallbackEmail: string) {
    const a = (raw ?? {}) as Record<string, any>;
    const fullName: string = a.fullName || '';
    const [firstFromFull, ...restFromFull] = fullName.split(' ');
    const phone = a.phone || a.contactNo || '';
    const pincode = a.pincode || a.zipCode || a.postalCode || '';
    return {
      ...a,
      firstName: a.firstName || firstFromFull || '',
      lastName: a.lastName || restFromFull.join(' ') || '',
      fullName,
      address: a.address || a.line1 || a.addressLine1 || '',
      addressLine1: a.addressLine1 || a.line1 || '',
      addressLine2: a.addressLine2 || a.line2 || '',
      city: a.city || '',
      state: a.state || '',
      pincode,
      zipCode: pincode,
      postalCode: pincode,
      phone,
      contactNo: phone,
      email: a.email || fallbackEmail || '',
      country: a.country || 'India',
    };
  }

  private adaptItem(i: OrderItem) {
    return {
      id: i.id,
      productId: i.productId,
      slug: i.slug,
      title: i.title,
      image: i.image,
      price: i.price,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      // Detail page reads item.product.{name,thumbnail,media[].publicUrl}.
      product: {
        name: i.title,
        thumbnail: i.image,
        media: i.image ? [{ publicUrl: i.image }] : [],
      },
    };
  }

  /** A row in the admin orders table. */
  private toAdminRow(order: AdminOrder) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      invoiceNumber: null as string | null,
      invoiceSequence: null as number | null,
      status: order.status,
      // The exact admin label last set (out_for_delivery / rejected / …), or null
      // to fall back to `status`. The dashboard shows and re-selects this.
      adminStatus: order.adminStatus ?? null,
      totalAmount: order.total,
      paymentMethod: order.paymentLabel,
      createdAt: order.createdAt.toISOString(),
      isManualOrder: false,
      shippingAddress: this.adaptAddress(order.shippingAddress, order.email),
      user: {
        id: order.user?.id ?? null,
        email: order.user?.email ?? order.email,
        profiles: order.user?.profiles ?? [],
      },
      items: order.items.map((i) => this.adaptItem(i)),
    };
  }

  /** The order detail page's shape — the table row plus the fields its cards read
   *  (totals, payment/tracking/sheets), defaulted where the lean model has no
   *  backing column so the page renders without NaNs or crashes. */
  private toAdminDetail(order: AdminOrder) {
    return {
      ...this.toAdminRow(order),
      subtotal: order.subtotal,
      shippingCost: order.shipping,
      discountAmount: order.discount,
      couponCode: order.couponCode,
      orderNote: null,
      rejectionReason: null,
      // Payment breakdown inputs (computeInvoiceBreakdown reads these).
      razorpayPaymentId: null,
      paymentStatus: null,
      walletPointsUsed: 0,
      walletAmountUsed: 0,
      onlineAmountPaid: null,
      codDueAmount: null,
      // Delivery/tracking cards (guarded by trackingNumber; stay hidden).
      trackingNumber: null,
      courierName: null,
      estimatedDelivery: null,
      deliveryStatus: null,
      // Google Sheets sync card. Orders placed before the sync existed have no
      // stored state at all — they read as "pending" (never attempted), which
      // is exactly what they are, and the page's "Add to Sheet" button fixes.
      sheetSyncStatus: order.sheetSyncStatus ?? 'pending',
      sheetSyncedAt: order.sheetSyncedAt?.toISOString() ?? null,
      sheetSyncError: order.sheetSyncError ?? null,
    };
  }

  /** Shape an order (with items) for the email templates. Reads the customer's
   *  name from the frozen shipping snapshot; `AdminOrder` is assignable here
   *  since it extends `OrderWithItems`. */
  private toOrderEmailData(order: OrderWithItems): OrderEmailData {
    const addr = (order.shippingAddress ?? {}) as Record<string, unknown>;
    const fullName = typeof addr.fullName === 'string' ? addr.fullName : '';
    return {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerName: fullName || 'there',
      customerEmail: order.email,
      createdAt: order.createdAt.toISOString(),
      paymentLabel: order.paymentLabel,
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount,
      couponCode: order.couponCode,
      total: order.total,
      items: order.items.map((i) => ({
        name: i.title,
        image: i.image,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: i.price,
        lineTotal: i.price * i.quantity,
      })),
    };
  }

  private toResponse(order: OrderWithItems): OrderResponseDto {
    return {
      id: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i): OrderItemResponseDto => ({
        productId: i.productId,
        slug: i.slug,
        title: i.title,
        image: i.image,
        price: i.price,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      })),
      subtotal: order.subtotal,
      shipping: order.shipping,
      discount: order.discount,
      couponCode: order.couponCode,
      total: order.total,
      status: order.status,
      address: order.shippingAddress as unknown as AddressDto,
      email: order.email,
      paymentLabel: order.paymentLabel,
    };
  }
}
