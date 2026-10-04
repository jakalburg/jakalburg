import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

/** The event types a notification can have. Mirrors NotificationsService. */
export const NOTIFICATION_TYPES = [
  'order_placed',
  'order_shipped',
  'order_cancelled',
] as const;

export const NOTIFICATION_STATUSES = ['all', 'unread', 'read'] as const;

export type NotificationStatusFilter = (typeof NOTIFICATION_STATUSES)[number];

/**
 * Filters for the admin's alerts table. All optional — with none of them set
 * this is the plain newest-first list the header bell reads.
 */
export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: NOTIFICATION_STATUSES,
    default: 'all',
    description: 'Read state. `all` applies no filter.',
  })
  @IsOptional()
  @IsIn(NOTIFICATION_STATUSES)
  status?: NotificationStatusFilter;

  @ApiPropertyOptional({
    enum: NOTIFICATION_TYPES,
    description: 'Event type. Omit (or send `all`) for every type.',
  })
  @IsOptional()
  @IsIn([...NOTIFICATION_TYPES, 'all'])
  type?: string;

  @ApiPropertyOptional({
    description:
      'Free text matched against the title and message — an order number or a customer name.',
  })
  @IsOptional()
  @IsString()
  // Bounded so a pathological term can't be pushed into a LIKE scan.
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Only alerts raised at or after this instant (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({
    description: 'Only alerts raised at or before this instant (ISO 8601).',
  })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
