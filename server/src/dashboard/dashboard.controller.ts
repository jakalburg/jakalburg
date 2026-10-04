import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService, SalesPeriod } from './dashboard.service';
import { DashboardStatsDto, SalesPointDto } from './dto/dashboard-response.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

const PERIODS: SalesPeriod[] = ['week', 'month', 'year'];

/**
 * DashboardController — the admin home screen (`/`): headline tiles + the
 * revenue/orders chart. Recent orders come from `admin/orders` instead, which
 * already returns the row shape that screen renders.
 *
 * GUARDED: class-level @AdminOnly() — these are store-wide takings.
 */
@ApiTags('Dashboard')
@AdminOnly()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Admin: headline dashboard figures',
    description:
      'All-time revenue / orders / products / customers, each with its ' +
      'percentage change over the last 30 days.',
  })
  @ApiOkResponse({ type: DashboardStatsDto })
  getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }

  @Get('sales')
  @ApiOperation({
    summary: 'Admin: revenue + orders over time',
    description:
      'A continuous series (empty buckets included) for the revenue chart: ' +
      'week = last 7 days, month = last 30 days, year = last 12 months.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: PERIODS,
    description: "Defaults to 'month'; an unknown value falls back to it.",
  })
  @ApiOkResponse({ type: [SalesPointDto] })
  getSales(@Query('period') period?: string): Promise<SalesPointDto[]> {
    const resolved = PERIODS.includes(period as SalesPeriod)
      ? (period as SalesPeriod)
      : 'month';
    return this.dashboardService.getSales(resolved);
  }
}
