import { Module } from '@nestjs/common';
import {
  NotificationsController,
  NotificationSettingsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSettingsService } from './notification-settings.service';

/**
 * Admin notifications: the header bell and the preferences that gate both it
 * and the order emails.
 *
 * Both services are exported because OrdersService writes bell entries and
 * consults the email toggles before sending.
 */
@Module({
  controllers: [NotificationsController, NotificationSettingsController],
  providers: [NotificationsService, NotificationSettingsService],
  exports: [NotificationsService, NotificationSettingsService],
})
export class NotificationsModule {}
