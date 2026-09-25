import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderItem, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';

type OrderWithItems = Order & { items: OrderItem[] };

/** What a sync attempt did. `skipped` means Sheets isn't configured at all, so
 *  nothing was sent and nothing was recorded against the order. */
export interface SheetSyncResult {
  success: boolean;
  skipped: boolean;
  message: string;
}

/** The order shape the Apps Script expects. Mirrors the payload contract
 *  documented at the top of `google_sheets_appscript.gs` — keep the two in
 *  step, since the script validates these field names. */
interface SheetOrderPayload {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  contact: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  total: number;
  status: string;
  paymentLabel: string;
  items: {
    title: string;
    quantity: number;
    size: string;
    color: string;
  }[];
}

// Apps Script is a cold-starting Google service; a first call after idle can
// take several seconds. Long enough not to fail a healthy call, short enough
// that checkout never hangs on it.
const REQUEST_TIMEOUT_MS = 20000;

// Error text is persisted to `Order.sheetSyncError` and rendered in the admin.
// Google's failure pages are whole HTML documents, so cap what we keep.
const MAX_ERROR_LENGTH = 500;

/**
 * SheetsService — mirrors orders into the owner's Google Sheet via the deployed
 * Apps Script Web App (`google_sheets_appscript.gs` at the repo root).
 *
 * The sheet is a COPY, never a source of truth: every method here swallows its
 * own failures and resolves rather than throwing, so a Google outage, a wrong
 * secret, or a deleted deployment can never fail a checkout, block a status
 * change, or prevent an order from being deleted. What did happen is recorded
 * on the order (`sheetSyncStatus` / `sheetSyncedAt` / `sheetSyncError`) and
 * surfaced on the admin order page, where it can be retried by hand.
 *
 * With `GOOGLE_SHEETS_WEBHOOK_URL` or `GOOGLE_SHEETS_WEBHOOK_SECRET` unset the
 * whole feature is inert — calls return `skipped` without touching the network
 * or the order row.
 */
@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  get isConfigured(): boolean {
    return env.isGoogleSheetsConfigured;
  }

  /**
   * Add or update this order's row, then record the outcome on the order.
   * Safe to call repeatedly — the script upserts on the order id, so a re-sync
   * rewrites the existing row instead of appending a duplicate.
   */
  async syncOrder(order: OrderWithItems): Promise<SheetSyncResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        skipped: true,
        message: "Google Sheets sync isn't configured for this store.",
      };
    }

    const result = await this.post({
      action: 'upsertOrder',
      order: this.toSheetPayload(order),
    });

    await this.recordOutcome(order.id, result);

    return result;
  }

  /** Load the order by id and sync it. Used by the admin's "Add to Sheet"
   *  button and after a status change, where only the id is at hand. */
  async syncOrderById(id: string): Promise<SheetSyncResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        skipped: true,
        message: "Google Sheets sync isn't configured for this store.",
      };
    }

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return {
        success: false,
        skipped: false,
        message: `Order "${id}" not found.`,
      };
    }

    return this.syncOrder(order);
  }

  /**
   * Remove this order's row from the sheet. Nothing is recorded afterward —
   * this is only ever called as an order is being deleted, so there is no row
   * left to record it on. Deleting an order that never reached the sheet is a
   * success, not an error: the script reports `found: false` and the caller's
   * intent ("no row for this order") already holds.
   */
  async removeOrder(orderId: string): Promise<SheetSyncResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        skipped: true,
        message: "Google Sheets sync isn't configured for this store.",
      };
    }

    return this.post({ action: 'deleteOrder', orderId });
  }

  // ---- internals ------------------------------------------------------------

  /**
   * POST to the Web App and interpret the reply.
   *
   * Two things make this less ordinary than it looks. First, Apps Script always
   * answers a POST with a 302 to a one-shot `script.googleusercontent.com` echo
   * URL; fetch follows that automatically, so the JSON arrives on the redirect,
   * not the original response. Second, the script reports its OWN errors as
   * HTTP 200 with `{success: false}` in the body — an unknown action, a bad
   * secret, and a missing field all look fine at the HTTP layer. The body is
   * therefore what decides success, not the status code.
   */
  private async post(payload: Record<string, unknown>): Promise<SheetSyncResult> {
    try {
      const response = await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: env.GOOGLE_SHEETS_WEBHOOK_SECRET,
          ...payload,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const text = await response.text();

      if (!response.ok) {
        return this.failure(
          `Google Sheets returned HTTP ${response.status}. ${text}`,
        );
      }

      let body: { success?: boolean; message?: string };
      try {
        body = JSON.parse(text) as { success?: boolean; message?: string };
      } catch {
        // An HTML page here almost always means the deployment URL is stale or
        // its access isn't "Anyone" — Google served a sign-in/error page rather
        // than running the script.
        return this.failure(
          'Google Sheets returned a non-JSON response. Check that the Web App ' +
            'URL is current and its access is set to "Anyone".',
        );
      }

      if (!body.success) {
        return this.failure(body.message || 'Google Sheets rejected the order.');
      }

      return {
        success: true,
        skipped: false,
        message: body.message || 'Synced to Google Sheets.',
      };
    } catch (error) {
      const reason =
        error instanceof Error && error.name === 'TimeoutError'
          ? `Google Sheets did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`
          : error instanceof Error
            ? error.message
            : 'Unknown error contacting Google Sheets.';

      return this.failure(reason);
    }
  }

  private failure(message: string): SheetSyncResult {
    const trimmed = message.slice(0, MAX_ERROR_LENGTH);
    this.logger.warn(`Google Sheets sync failed: ${trimmed}`);
    return { success: false, skipped: false, message: trimmed };
  }

  /**
   * Persist the attempt on the order. Wrapped because the order may have been
   * deleted between the sync starting and finishing — recording the outcome is
   * bookkeeping, and failing it must never surface as a failed request.
   */
  private async recordOutcome(id: string, result: SheetSyncResult) {
    const data: Prisma.OrderUpdateInput = result.success
      ? {
          sheetSyncStatus: 'synced',
          sheetSyncedAt: new Date(),
          sheetSyncError: null,
        }
      : {
          sheetSyncStatus: 'failed',
          sheetSyncError: result.message,
        };

    try {
      await this.prisma.order.update({ where: { id }, data });
    } catch {
      this.logger.warn(`Could not record sheet sync state for order ${id}.`);
    }
  }

  /**
   * Flatten an order into the script's payload. Everything comes from the
   * frozen `shippingAddress` snapshot taken at checkout, so a row always
   * reflects where the parcel was actually going — not wherever the customer's
   * address book has drifted to since.
   */
  private toSheetPayload(order: OrderWithItems): SheetOrderPayload {
    const address = (order.shippingAddress ?? {}) as Record<string, unknown>;
    const text = (value: unknown): string =>
      typeof value === 'string' ? value : '';

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      customerName: text(address.fullName),
      contact: text(address.phone),
      email: order.email,
      line1: text(address.line1),
      line2: text(address.line2),
      city: text(address.city),
      state: text(address.state),
      pincode: text(address.pincode),
      total: order.total,
      // The granular admin label when one was set (out_for_delivery, rejected,
      // …), else the lean enum. The script maps either spelling to a readable
      // Status and ticks the Dispatched checkbox off the same value.
      status: order.adminStatus ?? order.status,
      paymentLabel: order.paymentLabel,
      items: order.items.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
    };
  }
}
