import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Admin patch of the payment configuration. Every field is optional — the form
 * sends the whole set, but a partial patch is fine.
 *
 * Each field the admin can send MUST be declared here or the global
 * ValidationPipe whitelist silently strips it.
 */
export class UpdatePaymentSettingsDto {
  @ApiPropertyOptional({ description: 'Offer Cash on Delivery at checkout.' })
  @IsOptional()
  @IsBoolean()
  codEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Offer online payment via Razorpay.' })
  @IsOptional()
  @IsBoolean()
  razorpayEnabled?: boolean;

  @ApiPropertyOptional({
    example: 'rzp_test_1234567890',
    description: "Razorpay's publishable key id. Safe to expose to the browser.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razorpayKeyId?: string;

  @ApiPropertyOptional({
    description:
      'Razorpay key secret. Stored encrypted and never returned. Omit or ' +
      'send an empty string to keep the current one.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  razorpayKeySecret?: string;
}
