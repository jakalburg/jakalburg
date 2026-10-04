import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * PaymentsController — payment configuration.
 *
 * Two deliberately different reads:
 *   • `GET /payments/methods` is PUBLIC and narrow — only which methods are
 *     live, plus Razorpay's publishable key id. Checkout renders from this.
 *   • `GET /payments/settings` is @AdminOnly() and returns the full row minus
 *     the secret, which no endpoint ever returns.
 */
@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Public: which payment methods checkout should offer. */
  @Get('methods')
  @ApiOperation({ summary: 'Public: enabled payment methods' })
  @ApiOkResponse({
    description:
      '{ cod, razorpay, razorpayKeyId? }. razorpay is false unless it is ' +
      'both enabled and fully configured.',
  })
  getMethods() {
    return this.paymentsService.getPublicMethods();
  }

  /** Admin: the full configuration, with `isRazorpaySecretSet` in place of the secret. */
  @Get('settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: payment configuration' })
  getSettings() {
    return this.paymentsService.getForAdmin();
  }

  /** Admin: update the configuration. A blank secret keeps the stored one. */
  @Patch('settings')
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update payment configuration' })
  updateSettings(@Body() dto: UpdatePaymentSettingsDto) {
    return this.paymentsService.update(dto);
  }
}
