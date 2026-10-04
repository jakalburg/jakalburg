import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';
import { PaymentIssuesService } from './payment-issues.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService, PaymentIssuesService],
  // OrdersModule needs all three: PaymentsService to gate COD, RazorpayService
  // to create and verify online payments, PaymentIssuesService to record a
  // capture that couldn't become an order.
  exports: [PaymentsService, RazorpayService, PaymentIssuesService],
})
export class PaymentsModule {}
