import { randomInt } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Order, OrderItem } from '@prisma/client';
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
