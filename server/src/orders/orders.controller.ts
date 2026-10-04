import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserWithRelations } from '../types/database.types';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  OrderListResponseDto,
  OrderResponseDto,
} from './dto/order.dto';
import { PaginationQueryDto } from '../common/pagination';
import {
  RazorpayOrderResponseDto,
  VerifyRazorpayDto,
} from './dto/razorpay.dto';
import { PaymentsService } from '../payments/payments.service';
import { RazorpayService } from '../payments/razorpay.service';
import { PaymentIssuesService } from '../payments/payment-issues.service';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly payments: PaymentsService,
    private readonly razorpayService: RazorpayService,
    private readonly paymentIssues: PaymentIssuesService,
  ) {}

  /** Place an order (checkout). Totals are computed server-side from live prices. */
  @Post()
  @ApiOperation({
    summary: 'Create an order',
    description:
      'Places an order for the authenticated user. Prices and item snapshots ' +
      'come from live products; the cart is cleared on success.',
  })
  @ApiCreatedResponse({ description: 'The created order.', type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or a product is unavailable.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async create(
    @Req() req: Request,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const user = req.user as UserWithRelations;

    // This route places COD orders only — an online order is written by
    // verifyRazorpay, after the payment is proved. Checkout hides COD when
    // it's off, but the toggle has to be enforced here too: the endpoint is
    // reachable directly, and without this check an admin who turned COD off
    // would still receive unpaid orders.
    const { cod } = await this.payments.getPublicMethods();
    if (!cod) {
      throw new BadRequestException(
        'Cash on Delivery is not available. Please pay online instead.',
      );
    }

    return this.ordersService.create(user.id, dto);
  }

  /**
   * Step 1 of paying online: create a payable Razorpay order.
   *
   * The amount is priced here from live products and the coupon — the browser
   * sends a cart, never a total. No order row is written yet, so an abandoned
   * payment leaves nothing behind.
   */
  @Post('razorpay-order')
  @ApiOperation({
    summary: 'Create a Razorpay order for checkout',
    description:
      'Prices the cart server-side and opens a payable Razorpay order. ' +
      'No order is stored until the payment is verified.',
  })
  @ApiCreatedResponse({ type: RazorpayOrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Razorpay is disabled/unconfigured, or the cart is invalid.',
  })
  async createRazorpayOrder(
    @Body() dto: CreateOrderDto,
  ): Promise<RazorpayOrderResponseDto> {
    const { razorpay, razorpayKeyId } =
      await this.payments.getPublicMethods();
    if (!razorpay || !razorpayKeyId) {
      throw new BadRequestException(
        'Online payment is not available right now.',
      );
    }

    // Throws 400 if a product vanished or the coupon stopped applying — all
    // before the customer is asked for money.
    const { total } = await this.ordersService.priceOrder(dto);
    if (total <= 0) {
      throw new BadRequestException('Order total must be greater than zero.');
    }

    const created = await this.razorpayService.createOrder(
      total * 100, // Order totals are whole rupees; Razorpay wants paise.
      `jb_${Date.now()}`,
    );

    return {
      razorpayOrderId: created.id,
      amount: created.amount,
      currency: created.currency,
      keyId: razorpayKeyId,
    };
  }

  /**
   * Step 2 of paying online: prove the payment, then write the order.
   *
   * Verification runs in two halves, and the boundary between them matters:
   *
   *   Before the signature check and the Razorpay-side fetch both pass, no
   *   money has provably moved, so a failure is an ordinary 400.
   *
   *   Once they pass, Razorpay is holding the customer's money. From that
   *   point a failure must NOT be a bare error — the customer has paid. Those
   *   are recorded as a PaymentIssue and answered with a reference the
   *   customer can quote, so a captured payment is never silently dropped.
   */
  @Post('verify-razorpay')
  @ApiOperation({
    summary: 'Verify a Razorpay payment and place the order',
    description:
      'Checks the signature, confirms the capture with Razorpay, re-prices ' +
      'the cart, then writes the order. Idempotent per payment id.',
  })
  @ApiCreatedResponse({ description: 'The placed order.', type: OrderResponseDto })
  @ApiBadRequestResponse({ description: 'The payment could not be verified.' })
  async verifyRazorpay(
    @Req() req: Request,
    @Body() dto: VerifyRazorpayDto,
  ): Promise<OrderResponseDto> {
    const user = req.user as UserWithRelations;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    // Razorpay's success handler can fire more than once. Return the order we
    // already wrote rather than writing a second one for the same payment.
    const existing =
      await this.ordersService.findByRazorpayPaymentId(razorpayPaymentId);
    if (existing) return existing;

    // ── No money has provably moved yet: plain rejections are safe. ────────
    const signatureValid = await this.razorpayService.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!signatureValid) {
      throw new BadRequestException('Payment signature could not be verified.');
    }

    // The signature only proves the pair was signed with our key. Ask
    // Razorpay directly whether it holds the money, and how much.
    const payment = await this.razorpayService.fetchPayment(razorpayPaymentId);
    if (
      payment.order_id !== razorpayOrderId ||
      !['authorized', 'captured'].includes(payment.status)
    ) {
      throw new BadRequestException('That payment did not complete.');
    }

    // ── Past this line Razorpay holds real money. Failures get a paper
    //    trail, never a bare error. ─────────────────────────────────────────
    try {
      // Re-price from live products. This is what stops a tampered cart: the
      // captured amount has to match what the order actually costs now.
      const { total } = await this.ordersService.priceOrder(dto.order);
      const expectedPaise = total * 100;
      if (payment.amount !== expectedPaise) {
        throw new Error(
          `Captured ${payment.amount} paise but the order prices at ${expectedPaise} paise.`,
        );
      }

      return await this.ordersService.create(user.id, dto.order, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        razorpayMethod: payment.method,
      });
    } catch (error) {
      throw await this.paymentIssues.record({
        razorpayOrderId,
        razorpayPaymentId,
        amountPaise: payment.amount,
        userId: user.id,
        email: dto.order.email,
        failureReason:
          error instanceof Error ? error.message : 'Unknown failure',
      });
    }
  }

  /** The authenticated user's order history (newest first, paginated). */
  @Get('me')
  @ApiOperation({
    summary: "Get the current user's order history",
    description: 'Paginated — defaults to page 1 × 10 orders.',
  })
  @ApiOkResponse({ description: 'The order history.', type: OrderListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  findMine(
    @Req() req: Request,
    @Query() query: PaginationQueryDto,
  ): Promise<OrderListResponseDto> {
    const user = req.user as UserWithRelations;
    return this.ordersService.findMine(user.id, query);
  }

  /** A single order by its number (only the owner can read it). */
  @Get(':orderNumber')
  @ApiOperation({ summary: 'Get one of the current user\'s orders by number' })
  @ApiOkResponse({ description: 'The order.', type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'No such order for this user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  findOne(
    @Req() req: Request,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    const user = req.user as UserWithRelations;
    return this.ordersService.findOne(user.id, orderNumber);
  }
}
