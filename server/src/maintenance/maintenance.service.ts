import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

/** What the storefront is allowed to know. No credential ever appears here. */
export interface MaintenanceStatus {
  active: boolean;
  title: string;
  message: string;
  endsAt: string | null;
  timezone: string;
  /** Store identity, so the maintenance page can brand itself — see getBrand(). */
  storeName: string | null;
  logo: string | null;
  /** True when THIS requester holds a valid preview token. Decided server-side. */
  bypass: boolean;
}

/** The admin view. Carries whether a token exists, never the token itself. */
export interface MaintenanceSettingsView {
  id: string;
  active: boolean;
  title: string;
  message: string;
  endsAt: string | null;
  timezone: string;
  hasPreviewToken: boolean;
  previewTokenSetAt: string | null;
}

export const DEFAULT_TITLE = 'We’ll be back shortly';
export const DEFAULT_MESSAGE =
  'The shop is closed for scheduled maintenance. Thanks for your patience — please check back soon.';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** Bytes of entropy in a preview token. 32 → 256 bits, not guessable. */
const TOKEN_BYTES = 32;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  /**
   * Memoised, because MaintenanceGuard consults this on EVERY request — an
   * uncached read would add a database round-trip to the whole API. Dropped on
   * update, so flipping the switch takes effect on the next request.
   */
  private cached: {
    active: boolean;
    title: string;
    message: string;
    endsAt: Date | null;
    timezone: string;
    previewTokenHash: string | null;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private async getRow() {
    const existing = await this.prisma.maintenanceSettings.findFirst();
    if (existing) return existing;
    return this.prisma.maintenanceSettings.create({ data: {} });
  }

  /**
   * The resolved config. NEVER throws: the guard runs in front of every route,
   * so a database blip here must not take down the API. On failure we assume
   * maintenance is OFF — failing open is right for a switch whose whole job is
   * to deny traffic, since failing closed would turn a transient DB error into
   * a total outage with no way to log in and fix it.
   */
  private async resolve() {
    if (this.cached) return this.cached;

    try {
      const row = await this.getRow();
      this.cached = {
        active: row.active,
        title: row.title?.trim() || DEFAULT_TITLE,
        message: row.message?.trim() || DEFAULT_MESSAGE,
        endsAt: row.endsAt,
        timezone: row.timezone?.trim() || DEFAULT_TIMEZONE,
        previewTokenHash: row.previewTokenHash,
      };
      return this.cached;
    } catch (error) {
      this.logger.warn(
        `Could not read MaintenanceSettings (${
          error instanceof Error ? error.message : 'unknown error'
        }). Assuming maintenance is OFF.`,
      );
      // Not memoised — the next request retries.
      return {
        active: false,
        title: DEFAULT_TITLE,
        message: DEFAULT_MESSAGE,
        endsAt: null,
        timezone: DEFAULT_TIMEZONE,
        previewTokenHash: null,
      };
    }
  }

  invalidate(): void {
    this.cached = null;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /**
   * Constant-time check of a presented token against the stored hash.
   *
   * Compares HASHES, not the raw tokens, so both sides are fixed-length and
   * `timingSafeEqual` can't throw on a length mismatch — and the comparison
   * leaks nothing about how much of the token was correct.
   */
  async verifyPreviewToken(token: string | undefined | null): Promise<boolean> {
    if (!token) return false;
    const { previewTokenHash } = await this.resolve();
    if (!previewTokenHash) return false;

    const presented = Buffer.from(this.hash(token), 'hex');
    const stored = Buffer.from(previewTokenHash, 'hex');
    if (presented.length !== stored.length) return false;

    return timingSafeEqual(presented, stored);
  }

  /** True when the request should be blocked: maintenance on, no valid token. */
  async shouldBlock(previewToken?: string | null): Promise<boolean> {
    const { active } = await this.resolve();
    if (!active) return false;
    return !(await this.verifyPreviewToken(previewToken));
  }

  /** Public status, plus whether this caller holds a valid preview token. */
  async getStatus(previewToken?: string | null): Promise<MaintenanceStatus> {
    const config = await this.resolve();
    const brand = await this.getBrand();
    return {
      active: config.active,
      title: config.title,
      message: config.message,
      endsAt: config.endsAt?.toISOString() ?? null,
      timezone: config.timezone,
      storeName: brand.storeName,
      logo: brand.logo,
      bypass: config.active
        ? await this.verifyPreviewToken(previewToken)
        : false,
    };
  }

  /**
   * The store's name and logo, carried on the status payload.
   *
   * They're here because of a chicken-and-egg problem: while maintenance is
   * on, GET /settings is blocked like everything else, so the maintenance page
   * can't look the brand up for itself — it would fall back to the logo
   * bundled with the client and quietly show a stale mark after the admin
   * uploads a new one. This endpoint is @AllowDuringMaintenance, so riding
   * along here is the only way the real logo reaches the page.
   *
   * Nothing is newly exposed: GET /settings is a public read anyway, and only
   * these two fields are copied across.
   *
   * Never throws — the whole point of this endpoint is to answer when other
   * things are failing, so a missing logo must not take the status with it.
   */
  private async getBrand(): Promise<{
    storeName: string | null;
    logo: string | null;
  }> {
    try {
      const settings = await this.settings.get();
      return {
        storeName: settings.storeName?.trim() || null,
        logo: settings.logo?.trim() || null,
      };
    } catch {
      return { storeName: null, logo: null };
    }
  }

  /** Admin read. */
  async getForAdmin(): Promise<MaintenanceSettingsView> {
    const row = await this.getRow();
    return {
      id: row.id,
      active: row.active,
      title: row.title ?? '',
      message: row.message ?? '',
      endsAt: row.endsAt?.toISOString() ?? null,
      timezone: row.timezone ?? DEFAULT_TIMEZONE,
      hasPreviewToken: Boolean(row.previewTokenHash),
      previewTokenSetAt: row.previewTokenSetAt?.toISOString() ?? null,
    };
  }

  /** Admin write. */
  async update(dto: UpdateMaintenanceDto): Promise<MaintenanceSettingsView> {
    const row = await this.getRow();

    const data: Record<string, unknown> = {};
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.message !== undefined) data.message = dto.message;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.endsAt !== undefined) {
      data.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }

    await this.prisma.maintenanceSettings.update({
      where: { id: row.id },
      data,
    });
    this.invalidate();

    if (dto.active !== undefined) {
      this.logger.warn(
        `Maintenance mode ${dto.active ? 'ENABLED' : 'DISABLED'} by an admin.`,
      );
    }
    return this.getForAdmin();
  }

  /**
   * Mint a new preview token, returning the plaintext EXACTLY ONCE. Only its
   * hash is stored, so a leaked database gives nobody a bypass, and there is
   * no endpoint that can read an existing token back.
   *
   * Regenerating immediately invalidates every previously shared link.
   */
  async regeneratePreviewToken(): Promise<{ token: string }> {
    const row = await this.getRow();
    const token = randomBytes(TOKEN_BYTES).toString('base64url');

    await this.prisma.maintenanceSettings.update({
      where: { id: row.id },
      data: {
        previewTokenHash: this.hash(token),
        previewTokenSetAt: new Date(),
      },
    });
    this.invalidate();
    this.logger.log('Maintenance preview token regenerated.');
    return { token };
  }

  /** Revoke the current token, closing every outstanding preview link. */
  async revokePreviewToken(): Promise<MaintenanceSettingsView> {
    const row = await this.getRow();
    await this.prisma.maintenanceSettings.update({
      where: { id: row.id },
      data: { previewTokenHash: null, previewTokenSetAt: null },
    });
    this.invalidate();
    this.logger.log('Maintenance preview token revoked.');
    return this.getForAdmin();
  }
}
