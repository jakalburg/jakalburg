import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailSettingsService } from './email-settings.service';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * EmailSettingsController — SMTP / delivery config behind the admin's
 * Settings → Email screen.
 *
 * EVERY route is @AdminOnly(): unlike the Settings singleton (which the
 * storefront reads publicly), this holds a credential. The stored password is
 * never returned by any route — the read exposes only `isSmtpConfigured`.
 */
@ApiTags('Settings')
@Controller('settings/email')
export class EmailSettingsController {
  constructor(private readonly emailSettings: EmailSettingsService) {}

  /** Admin: current SMTP settings, password excluded. */
  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: email / SMTP settings' })
  @ApiOkResponse({ description: 'Settings plus an isSmtpConfigured flag.' })
  get() {
    return this.emailSettings.getForAdmin();
  }

  /** Admin: update them. A blank password leaves the stored one untouched. */
  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update email / SMTP settings' })
  @ApiOkResponse({ description: 'The updated settings, password excluded.' })
  update(@Body() dto: UpdateEmailSettingsDto) {
    return this.emailSettings.update(dto);
  }

  /** Admin: connect and authenticate without sending a message. */
  @Post('verify')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: verify the SMTP connection' })
  @ApiOkResponse({ description: '{ success, message }.' })
  verify() {
    return this.emailSettings.verify();
  }
}
