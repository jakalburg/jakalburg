import { ApiProperty } from '@nestjs/swagger';

/**
 * The four headline tiles on the admin dashboard.
 *
 * Totals are all-time; the `*Change` figures are percentages against the
 * previous window, and what "previous" means differs by metric on purpose:
 *
 * - revenue / orders are FLOW metrics → last 30 days vs the 30 days before.
 * - products / customers are CUMULATIVE counts → the count now vs the count as
 *   of 30 days ago, i.e. a growth rate rather than a period-over-period delta.
 */
export class DashboardStatsDto {
  @ApiProperty({
    example: 184500,
    description:
      'All-time revenue in whole INR, summed over orders that still count as ' +
      'revenue (cancelled / returned / refunded are excluded).',
  })
  totalRevenue: number;

  @ApiProperty({ example: 128, description: 'All-time order count (every status).' })
  totalOrders: number;

  @ApiProperty({ example: 28, description: 'Products in the catalogue, active or hidden.' })
  totalProducts: number;

  @ApiProperty({ example: 93, description: 'Registered customers (non-admin users).' })
  totalCustomers: number;

  @ApiProperty({ example: 12, description: 'Revenue: last 30 days vs the 30 before (%).' })
  revenueChange: number;

  @ApiProperty({ example: -4, description: 'Orders: last 30 days vs the 30 before (%).' })
  ordersChange: number;

  @ApiProperty({ example: 7, description: 'Product count growth over the last 30 days (%).' })
  productsChange: number;

  @ApiProperty({ example: 3, description: 'Customer count growth over the last 30 days (%).' })
  customersChange: number;
}

/** One point on the revenue/orders chart. */
export class SalesPointDto {
  @ApiProperty({ example: '4 Oct', description: 'X-axis label for the bucket.' })
  name: string;

  @ApiProperty({ example: 12400, description: 'Revenue in the bucket (whole INR).' })
  revenue: number;

  @ApiProperty({ example: 6, description: 'Orders in the bucket.' })
  orders: number;
}
