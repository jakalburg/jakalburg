import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { AllowDuringMaintenance } from './allow-during-maintenance.decorator';
import { PREVIEW_HEADER } from './maintenance.guard';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * Public maintenance status.
 *
 * @AllowDuringMaintenance because the storefront's middleware calls this on
 * every request to decide whether to serve the site — if maintenance blocked
 * it, the maintenance page could never be rendered.
 *
 * Returns only customer-facing copy plus a server-decided `bypass` flag. The
 * preview token hash never leaves the database.
 */
@ApiTags('Maintenance')
@Controller('maintenance')
export class MaintenanceStatusController {
  constructor(private readonly maintenance: MaintenanceService) {}

  /**
   * Rate-limited well below the global 60/min: this endpoint is the only place
   * a preview token can be tested, so it is the only brute-force surface. At
   * 20/min a 256-bit token is not findable in any number of lifetimes, and a
   * legitimate visitor never comes close to the limit.
   */
  @Get('status')
  @AllowDuringMaintenance()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Public: maintenance status' })
  @ApiOkResponse({
    description: 'Banner copy plus whether this caller holds a valid token.',
  })
  status(
    @Headers(PREVIEW_HEADER) headerToken?: string,
    @Query('preview') queryToken?: string,
  ) {
    return this.maintenance.getStatus(headerToken || queryToken);
  }
}

/**
 * Admin control of maintenance mode. Every route is @AdminOnly(), which also
 * means MaintenanceGuard lets them through while maintenance is on — this is
 * the way back out, so it must never be blocked by the thing it controls.
 */
@ApiTags('Settings')
@Controller('settings/maintenance')
export class MaintenanceController {
  constructor(private readonly maintenance: MaintenanceService) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: maintenance settings' })
  @ApiOkResponse({ description: 'Settings plus a hasPreviewToken flag.' })
  get() {
    return this.maintenance.getForAdmin();
  }

  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Admin: update maintenance settings' })
  @ApiOkResponse({ description: 'The updated settings.' })
  update(@Body() dto: UpdateMaintenanceDto) {
    return this.maintenance.update(dto);
  }

  /**
   * Mint a preview token. The plaintext is in THIS response and nowhere else —
   * only its hash is stored, so it can never be read back. Regenerating
   * invalidates every link already shared.
   */
  @Post('preview-token')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: generate a new preview token' })
  @ApiOkResponse({ description: '{ token } — shown once, never retrievable.' })
  regenerate() {
    return this.maintenance.regeneratePreviewToken();
  }

  /** Revoke the current token, closing every outstanding preview link. */
  @Post('preview-token/revoke')
  @AdminOnly()
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin: revoke the preview token' })
  @ApiOkResponse({ description: 'The updated settings.' })
  revoke() {
    return this.maintenance.revokePreviewToken();
  }
}
