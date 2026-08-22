import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CartItemInputDto,
  CartItemResponseDto,
  CartResponseDto,
} from './dto/cart.dto';

// Composite identity of a cart line — mirrors the client's `itemKey`.
const lineKey = (i: { productId: string; size: string; color: string }) =>
  `${i.productId}::${i.size}::${i.color}`;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /** The user's cart, enriched with live product data. Lines whose product no
   *  longer exists are dropped (so a deleted product never breaks the cart). */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cart || cart.items.length === 0) return { items: [] };
    return { items: await this.enrich(cart.items) };
  }

  /** Replace the user's cart with exactly `items` (full mirror from the client).
   *  Input is de-duplicated by line key (summing quantities) to respect the
   *  `@@unique([cartId, productId, size, color])` constraint. */
  async replaceCart(
    userId: string,
    items: CartItemInputDto[],
  ): Promise<CartResponseDto> {
    const deduped = this.dedupe(items);

    await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (deduped.length > 0) {
        await tx.cartItem.createMany({
          data: deduped.map((i) => ({
            cartId: cart.id,
            productId: i.productId,
            size: i.size,
            color: i.color,
            quantity: Math.max(1, i.quantity),
          })),
        });
      }
    });

    return this.getCart(userId);
  }

  /** Merge (sum) duplicate lines and clamp quantities to >= 1. */
  private dedupe(items: CartItemInputDto[]): CartItemInputDto[] {
    const map = new Map<string, CartItemInputDto>();
    for (const raw of items) {
      const item = { ...raw, quantity: Math.max(1, raw.quantity) };
      const key = lineKey(item);
      const existing = map.get(key);
      if (existing) existing.quantity += item.quantity;
      else map.set(key, item);
    }
    return [...map.values()];
  }

  /** Join cart lines to their live products, dropping any orphaned lines. */
  private async enrich(
    lines: { productId: string; size: string; color: string; quantity: number }[],
  ): Promise<CartItemResponseDto[]> {
    const ids = [...new Set(lines.map((l) => l.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, title: true, images: true, price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const out: CartItemResponseDto[] = [];
    for (const line of lines) {
      const p = byId.get(line.productId);
      if (!p) continue; // product removed — drop the orphaned line
      out.push({
        productId: p.id,
        slug: p.slug,
        title: p.title,
        image: p.images[0] ?? '',
        price: p.price,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
      });
    }
    return out;
  }
}
