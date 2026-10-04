import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * PaymentIssuesService — the safety net under online checkout.
 *
 * Called only from the far side of payment verification, where Razorpay has
 * already captured the customer's money but the order could not be written.
 * Every such case is recorded and answered with a reference, so no captured
 * payment can vanish without someone being able to find it.
 *
 * If this service is doing anything, something is wrong and a human needs to
 * refund or place the order by hand. The table should normally be empty.
 */
@Injectable()
export class PaymentIssuesService {
  private readonly logger = new Logger(PaymentIssuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a captured-but-unsaved payment and build the error to throw.
   *
   * Returns the exception rather than throwing it so the caller's `throw` is
   * visible at the call site. A 409 (not 500): nothing is broken server-side,
   * the payment and the order simply disagree and a person has to settle it.
   */
  async record(params: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    amountPaise: number;
    userId?: string;
    email?: string;
    failureReason: string;
  }): Promise<ConflictException> {
    const reference = `PAY-${Date.now().toString(36).toUpperCase()}-${randomInt(1000, 9999)}`;

    // Log first and at error level: if the write below fails too, this line is
    // the only remaining record that money went missing.
    this.logger.error(
      `Payment captured but the order could not be placed. ` +
        `payment=${params.razorpayPaymentId} order=${params.razorpayOrderId} ` +
        `amountPaise=${params.amountPaise} user=${params.userId ?? 'unknown'}: ` +
        params.failureReason,
    );

    let issueReference = reference;
    try {
      // Upsert on the payment id so a retried callback reuses its row and the
      // customer keeps being told the same reference.
      const issue = await this.prisma.paymentIssue.upsert({
        where: { razorpayPaymentId: params.razorpayPaymentId },
        create: {
          reference,
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId,
          amountPaise: params.amountPaise,
          userId: params.userId ?? null,
          email: params.email ?? null,
          failureReason: params.failureReason,
        },
        update: {},
      });
      issueReference = issue.reference;
    } catch (error) {
      // Recording failed as well. The log line above still stands, and the
      // customer must not be told everything is fine.
      this.logger.error(
        `Could not record the payment issue for ${params.razorpayPaymentId}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    return new ConflictException({
      message:
        'Your payment went through, but we could not place the order. ' +
        'Nothing further will be charged — our team will contact you to ' +
        'complete or refund it. Please quote this reference.',
      reference: issueReference,
      errorCode: 'PAYMENT_CAPTURED_ORDER_FAILED',
    });
  }
}
