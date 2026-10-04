import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderDto } from './order.dto';

/** What the browser hands back after Razorpay's checkout succeeds. */
export class VerifyRazorpayDto {
  @ApiProperty({ example: 'order_NabcXYZ123' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_NabcXYZ456' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'HMAC-SHA256 of "orderId|paymentId", hex.' })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;

  /**
   * The order to write once the payment checks out.
   *
   * Re-sent rather than stashed server-side at the razorpay-order step so
   * there's no half-order sitting in the database waiting on a payment that
   * may never come. It's re-priced from live products before anything is
   * written, and the result must match what Razorpay actually captured — so a
   * tampered cart fails verification instead of buying anything cheaply.
   */
  @ApiProperty({ type: CreateOrderDto })
  @ValidateNested()
  @Type(() => CreateOrderDto)
  order: CreateOrderDto;
}

/** Response of POST /orders/razorpay-order — everything the browser needs to open checkout. */
export class RazorpayOrderResponseDto {
  @ApiProperty({ example: 'order_NabcXYZ123' })
  razorpayOrderId: string;

  @ApiProperty({ example: 249900, description: 'Amount in paise.' })
  amount: number;

  @ApiProperty({ example: 'INR' })
  currency: string;

  @ApiProperty({
    example: 'rzp_test_1234567890',
    description: "Razorpay's publishable key id, for the browser checkout.",
  })
  keyId: string;
}
