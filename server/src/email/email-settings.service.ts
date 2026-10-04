import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../config/env';
import { decryptSecret, encryptSecret } from '../common/crypto.util';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';

/** Everything EmailService needs to send a message. Always fully resolved: a
 *  blank DB field falls back to its SMTP_* env var. */
export interface ResolvedEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  ownerEmail: string;
}

/** The admin-facing view. Note the absence of the password — only whether one
 *  is set is ever exposed. */
export interface EmailSettingsView {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpFromEmail: string;
  smtpFromName: string;
  ownerEmail: string;
  isSmtpConfigured: boolean;
}

@Injectable()
export class EmailSettingsService {
  private readonly logger = new Logger(EmailSettingsService.name);

  /** Resolved config is read on every send, so cache it and drop the cache on
   *  update. Avoids a database round-trip per email. */
  private cached: ResolvedEmailConfig | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * The singleton, created on first read and seeded from the SMTP_* env vars.
   * This is the "transfer env into the table" step: it happens automatically
   * the first time anything touches email settings, so a running deployment
   * carries its current configuration across without manual entry.
   */
  private async getRow() {
    const existing = await this.prisma.emailSettings.findFirst();
    if (existing) return existing;

    this.logger.log('Seeding EmailSettings from SMTP_* environment variables');
    return this.prisma.emailSettings.create({
      data: {
        smtpHost: env.SMTP_HOST || null,
        smtpPort: env.SMTP_PORT || null,
        smtpSecure: env.SMTP_SECURE,
        smtpUser: env.SMTP_USER || null,
        smtpPassword: env.SMTP_PASSWORD
          ? encryptSecret(env.SMTP_PASSWORD)
          : null,
        smtpFromEmail: env.SMTP_FROM_EMAIL || null,
        smtpFromName: env.SMTP_FROM_NAME || null,
        ownerEmail: env.OWNER_EMAIL || null,
      },
    });
  }

  /** Admin read — never includes the password. */
  async getForAdmin(): Promise<EmailSettingsView> {
    const row = await this.getRow();
    return {
      id: row.id,
      smtpHost: row.smtpHost ?? '',
      smtpPort: row.smtpPort ?? env.SMTP_PORT,
      smtpSecure: row.smtpSecure ?? env.SMTP_SECURE,
      smtpUser: row.smtpUser ?? '',
      smtpFromEmail: row.smtpFromEmail ?? '',
      smtpFromName: row.smtpFromName ?? '',
      ownerEmail: row.ownerEmail ?? '',
      isSmtpConfigured: Boolean(
        (row.smtpHost || env.SMTP_HOST) &&
          (row.smtpUser || env.SMTP_USER) &&
          (decryptSecret(row.smtpPassword) || env.SMTP_PASSWORD),
      ),
    };
  }

  /**
   * Admin write. The password is only touched when a non-empty one is sent —
   * the admin form submits a blank field to mean "leave it alone", so saving
   * other settings can never wipe a working credential.
   */
  async update(dto: UpdateEmailSettingsDto): Promise<EmailSettingsView> {
    const row = await this.getRow();

    const data: Record<string, unknown> = {};
    if (dto.smtpHost !== undefined) data.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) data.smtpPort = dto.smtpPort;
    if (dto.smtpSecure !== undefined) data.smtpSecure = dto.smtpSecure;
    if (dto.smtpUser !== undefined) data.smtpUser = dto.smtpUser;
    if (dto.smtpFromEmail !== undefined) data.smtpFromEmail = dto.smtpFromEmail;
    if (dto.smtpFromName !== undefined) data.smtpFromName = dto.smtpFromName;
    if (dto.ownerEmail !== undefined) data.ownerEmail = dto.ownerEmail;
    if (dto.smtpPassword) data.smtpPassword = encryptSecret(dto.smtpPassword);

    await this.prisma.emailSettings.update({ where: { id: row.id }, data });
    this.cached = null; // next send picks up the change
    return this.getForAdmin();
  }

  /** Config for the transport. DB first, env as the fallback per field. */
  async resolve(): Promise<ResolvedEmailConfig> {
    if (this.cached) return this.cached;

    const row = await this.getRow();
    const resolved: ResolvedEmailConfig = {
      host: row.smtpHost || env.SMTP_HOST,
      port: row.smtpPort ?? env.SMTP_PORT,
      secure: row.smtpSecure ?? env.SMTP_SECURE,
      user: row.smtpUser || env.SMTP_USER,
      password: decryptSecret(row.smtpPassword) || env.SMTP_PASSWORD,
      fromEmail: row.smtpFromEmail || env.SMTP_FROM_EMAIL,
      fromName: row.smtpFromName || env.SMTP_FROM_NAME,
      ownerEmail: row.ownerEmail || env.OWNER_EMAIL,
    };

    this.cached = resolved;
    return resolved;
  }

  /** Drop the cache — used after an external change. */
  invalidate(): void {
    this.cached = null;
  }

  /**
   * Opens a connection and authenticates, without sending anything. Backs the
   * admin's "Verify connection" button so a typo is caught at configuration
   * time rather than on the next customer order.
   */
  async verify(): Promise<{ success: boolean; message: string }> {
    const config = await this.resolve();

    if (!config.host || !config.user || !config.password) {
      return {
        success: false,
        message: 'SMTP is not fully configured — host, user and password are required.',
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.password },
      });
      await transporter.verify();
      return {
        success: true,
        message: `Connected to ${config.host}:${config.port} as ${config.user}.`,
      };
    } catch (error) {
      // The message can echo the server's rejection; it must never echo creds.
      const reason =
        error instanceof Error ? error.message : 'Unknown SMTP error';
      this.logger.warn(`SMTP verification failed: ${reason}`);
      return { success: false, message: reason };
    }
  }
}
