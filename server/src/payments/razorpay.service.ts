import { Injectable, Logger } from '@nestjs/common';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'crypto';
import { PaymentsService } from './payments.service';

/** The subset of a Razorpay payment we actually check. */
export interface RazorpayPayment {
  id: string;
  order_id: string;
  status: string;
  amount: number; // paise
  method?: string;
}

/**
 * RazorpayService — creates payable orders and proves a payment really
 * happened.
 *
 * The SDK client is built per call from the credentials in PaymentSettings
 * rather than cached, so rotating keys in the admin takes effect immediately
 * without a restart.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private readonly payments: PaymentsService) {}

  /** True when both halves of the credential are present. */
  async isConfigured(): Promise<boolean> {
    const { keyId, keySecret } = await this.payments.getRazorpayCredentials();
    return Boolean(keyId && keySecret);
  }

  private async client(): Promise<Razorpay> {
    const { keyId, keySecret } = await this.payments.getRazorpayCredentials();
    if (!keyId || !keySecret) {
      throw new Error(
        'Razorpay is not configured. Add the key id and secret in ' +
          'Settings → Payments.',
      );
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  /**
   * Create a payable Razorpay order.
   *
   * `amountPaise` is computed server-side from the cart — the browser never
   * gets to say what it owes.
   */
  async createOrder(
    amountPaise: number,
    receipt: string,
    currency = 'INR',
  ): Promise<{ id: string; amount: number; currency: string }> {
    const razorpay = await this.client();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt,
    });
    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  /**
   * Verify the HMAC Razorpay's browser checkout hands back.
   *
   * This proves the (order, payment) pair was signed by someone holding our
   * key secret — i.e. Razorpay — so the browser can't fabricate a success.
   * Compared in constant time: a plain `===` on an HMAC leaks, through timing,
   * how many leading bytes a forged signature got right.
   */
  async verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<boolean> {
    const { keySecret } = await this.payments.getRazorpayCredentials();
    if (!keySecret) return false;

    const expected = createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest();
    let provided: Buffer;
    try {
      provided = Buffer.from(razorpaySignature, 'hex');
    } catch {
      return false;
    }

    return (
      provided.length === expected.length && timingSafeEqual(provided, expected)
    );
  }

  /**
   * Read the payment back from Razorpay.
   *
   * The signature only proves the pair was signed; this proves Razorpay
   * actually holds the money, and for how much. Both are needed — a signature
   * alone would accept a replayed authorised-then-failed payment.
   */
  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    const razorpay = await this.client();
    const payment = await razorpay.payments.fetch(paymentId);
    return {
      id: String(payment.id),
      order_id: String(payment.order_id),
      status: String(payment.status),
      amount: Number(payment.amount),
      method: payment.method ? String(payment.method) : undefined,
    };
  }
}
