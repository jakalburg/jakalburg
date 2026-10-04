import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

/** The six toggles, resolved. No credential or user id is involved. */
export interface ResolvedNotificationPrefs {
  emailOrderPlaced: boolean;
  emailOrderShipped: boolean;
  emailOrderCancelled: boolean;
  inAppOrderPlaced: boolean;
  inAppOrderShipped: boolean;
  inAppOrderCancelled: boolean;
}

export interface NotificationSettingsView extends ResolvedNotificationPrefs {
  id: string;
}

/**
 * What a store that has never opened the screen gets, and what we fall back to
 * when the row can't be read. "Notify about everything" is the safe direction:
 * the failure mode is an extra email, not a missed order.
 */
const DEFAULTS: ResolvedNotificationPrefs = {
  emailOrderPlaced: true,
  emailOrderShipped: true,
  emailOrderCancelled: true,
  inAppOrderPlaced: true,
  inAppOrderShipped: true,
  inAppOrderCancelled: true,
};

@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  /**
   * Memoised: this is consulted on every order placement and every status
   * change, and the row changes roughly never. Dropped on update.
   */
  private cached: ResolvedNotificationPrefs | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async getRow() {
    const existing = await this.prisma.notificationSettings.findFirst();
    if (existing) return existing;
    return this.prisma.notificationSettings.create({ data: {} });
  }

  /**
   * The resolved preferences. NEVER throws — it sits in the path of order
   * creation, and a missing table or a dropped connection must not be able to
   * fail a checkout that has already been paid for.
   */
  async resolve(): Promise<ResolvedNotificationPrefs> {
    if (this.cached) return this.cached;

    try {
      const row = await this.getRow();
      this.cached = {
        emailOrderPlaced: row.emailOrderPlaced,
        emailOrderShipped: row.emailOrderShipped,
        emailOrderCancelled: row.emailOrderCancelled,
        inAppOrderPlaced: row.inAppOrderPlaced,
        inAppOrderShipped: row.inAppOrderShipped,
        inAppOrderCancelled: row.inAppOrderCancelled,
      };
      return this.cached;
    } catch (error) {
      this.logger.warn(
        `Could not read NotificationSettings (${
          error instanceof Error ? error.message : 'unknown error'
        }). Falling back to notifying about everything.`,
      );
      // Deliberately NOT memoised — the next call retries the database.
      return { ...DEFAULTS };
    }
  }

  /** Admin read. Same shape the PATCH returns, so the UI can reuse it. */
  async get(): Promise<NotificationSettingsView> {
    const row = await this.getRow();
    return this.toView(row.id, await this.resolve());
  }

  async update(
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsView> {
    const current = await this.getRow();
    const updated = await this.prisma.notificationSettings.update({
      where: { id: current.id },
      data: dto,
    });
    this.cached = null;
    return this.toView(updated.id, {
      emailOrderPlaced: updated.emailOrderPlaced,
      emailOrderShipped: updated.emailOrderShipped,
      emailOrderCancelled: updated.emailOrderCancelled,
      inAppOrderPlaced: updated.inAppOrderPlaced,
      inAppOrderShipped: updated.inAppOrderShipped,
      inAppOrderCancelled: updated.inAppOrderCancelled,
    });
  }

  private toView(
    id: string,
    prefs: ResolvedNotificationPrefs,
  ): NotificationSettingsView {
    return { id, ...prefs };
  }
}
