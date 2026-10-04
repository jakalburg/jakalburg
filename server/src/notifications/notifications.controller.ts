import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';

/**
 * The admin header's notification bell.
 *
 * Everything here is @AdminOnly — these rows describe orders (customer names,
 * totals) and are never customer-facing. Note there is no "create" route:
 * notifications are only ever written by the server in response to a real
 * event, so there is nothing for a client to post.
 */
@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'A filtered page of notifications, newest first' })
  @ApiOkResponse({
    description:
      'Standard pagination envelope, plus `unreadTotal` across all alerts.',
  })
  findAll(@Query() query: NotificationQueryDto) {
    return this.notifications.findAll(query);
  }

  /**
   * Declared before `:id/read` only for readability — the two never collide,
   * since this path is one segment and that one is two.
   */
  @Patch('read-all')
  @AdminOnly()
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  markAllRead() {
    return this.notifications.markAllRead();
  }

  @Patch(':id/read')
  @AdminOnly()
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(@Param('id') id: string) {
    return this.notifications.markRead(id);
  }
}

/**
 * Settings → Notifications. A store-wide singleton, so there is no user id in
 * the path: see the comment on the Prisma model for why these are store
 * settings rather than per-account preferences.
 */
@ApiTags('Settings')
@Controller('settings/notifications')
export class NotificationSettingsController {
  constructor(private readonly settings: NotificationSettingsService) {}

  @Get()
  @AdminOnly()
  @ApiOperation({ summary: 'Read the notification preferences' })
  get() {
    return this.settings.get();
  }

  @Patch()
  @AdminOnly()
  @ApiOperation({ summary: 'Update the notification preferences' })
  update(@Body() dto: UpdateNotificationSettingsDto) {
    return this.settings.update(dto);
  }
}
