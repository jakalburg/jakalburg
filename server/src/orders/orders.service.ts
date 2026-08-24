import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Order, OrderItem, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddressDto } from '../common/dto/address.dto';
import {
  CreateOrderDto,
  OrderItemResponseDto,
  OrderResponseDto,
} from './dto/order.dto';

type OrderWithItems = Order & { items: OrderItem[] };

const INCLUDE_ITEMS = { items: true } satisfies Prisma.OrderInclude;
const MAX_ORDER_NUMBER_ATTEMPTS = 5;

// Admin reads pull the owning user + their first profile so the orders screen
// can show a real customer name/email alongside the frozen shipping snapshot.
const ADMIN_INCLUDE = {
  items: true,
  user: { include: { profiles: { orderBy: { createdAt: 'asc' }, take: 1 } } },
} satisfies Prisma.OrderInclude;

type AdminOrder = Prisma.OrderGetPayload<{ include: typeof ADMIN_INCLUDE }>;

// The lean store only persists these three states. The admin UI offers a richer
// vocabulary (pending/confirmed/out_for_delivery/…); we fold each admin label
// onto the nearest storable enum, and refuse the ones with no equivalent rather
// than silently mis-storing them.
const ADMIN_STATUS_TO_ENUM: Record<string, OrderStatus> = {
  pending: OrderStatus.processing,
  confirmed: OrderStatus.processing,
  processing: OrderStatus.processing,
  shipped: OrderStatus.shipped,
  out_for_delivery: OrderStatus.shipped,
  delivered: OrderStatus.delivered,
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create an order from the given lines. Prices/snapshots come from the LIVE
   *  products (never the client) so totals can't be tampered with. The user's
   *  cart is cleared in the same transaction. */
  async create(userId: string, dto: CreateOrderDto): Promise<OrderResponseDto> {
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
    const discount = dto.discount ?? 0;
    const total = Math.max(0, subtotal + shipping - discount);

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
            total,
            email: dto.email,
            paymentLabel: dto.paymentLabel,
            shippingAddress,
            items: { create: items },
          },
          include: INCLUDE_ITEMS,
        });

        // Emptied on checkout — the cart's job is done.
        const cart = await tx.cart.findUnique({ where: { userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }

        return created;
      }),
    );

    return this.toResponse(order);
  }

  /** The user's order history, newest first. */
  async findMine(userId: string): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: INCLUDE_ITEMS,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((o) => this.toResponse(o));
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

  /** Every order, newest first, adapted to the admin table's shape. */
  async adminFindAll(params: {
    page?: number | string;
    limit?: number | string;
    status?: string;
  }) {
    const take = Math.min(Math.max(Number(params.limit) || 50, 1), 1000);
    const page = Math.max(Number(params.page) || 1, 1);
    const skip = (page - 1) * take;

    const where: Prisma.OrderWhereInput = {};
    const status = params.status?.toLowerCase();
    if (status && status !== 'all' && this.isStorableStatus(status)) {
      where.status = ADMIN_STATUS_TO_ENUM[status];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.toAdminRow(r)),
      total,
      skip,
      take,
      hasMore: skip + rows.length < total,
    };
  }

  /** One order (by internal id) with the fuller detail-page shape. */
  async adminFindOne(id: string) {
    return this.toAdminDetail(await this.getAdminOrderOr404(id));
  }

  /** Set an order's status. `notifyCustomer` is accepted but not yet wired to
   *  email (no order-status templates exist), so `emailSent` is always false. */
  async adminUpdateStatus(id: string, rawStatus: string, _notify = false) {
    const order = await this.getAdminOrderOr404(id);
    const mapped = this.mapAdminStatus(rawStatus);
    const statusChanged = order.status !== mapped;
    if (statusChanged) {
      await this.prisma.order.update({ where: { id }, data: { status: mapped } });
    }
    return { success: true, statusChanged, emailSent: false };
  }

  /** Accept an order (→ processing). */
  async adminConfirm(id: string) {
    await this.getAdminOrderOr404(id);
    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.processing },
    });
    return { success: true };
  }

  /** Reject — the lean store has no cancelled/rejected state, so this is refused
   *  rather than silently mis-stored. (In practice the UI only offers reject for
   *  pending COD orders, which this store never produces.) */
  async adminReject(id: string, _reason?: string) {
    await this.getAdminOrderOr404(id);
    throw new BadRequestException(
      'Rejecting orders is not supported in this store yet.',
    );
  }

  /** Mark an order shipped. Tracking/courier details can't be persisted (no
   *  columns on the lean model), so only the status transition is stored. */
  async adminShip(id: string, _tracking?: unknown) {
    await this.getAdminOrderOr404(id);
    await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.shipped },
    });
    return { success: true };
  }

  /** Permanently delete an order (its items cascade). */
  async adminRemove(id: string): Promise<{ success: boolean; id: string }> {
    await this.getAdminOrderOr404(id);
    await this.prisma.order.delete({ where: { id } });
    return { success: true, id };
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
        `Status "${rawStatus}" is not supported by this store (allowed: processing, shipped, delivered).`,
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
      couponCode: null,
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
      // Google Sheets sync card (feature not configured for this store).
      sheetSyncStatus: 'pending',
      sheetSyncedAt: null,
      sheetSyncError: null,
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
      total: order.total,
      status: order.status,
      address: order.shippingAddress as unknown as AddressDto,
      email: order.email,
      paymentLabel: order.paymentLabel,
    };
  }
}
