import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import { env } from '../config/env';

/**
 * Email delivery via nodemailer + ejs templates.
 *
 * Diverges from kaybykhushie (which reads SMTP creds from a DB Settings
 * record): here SMTP config comes straight from `env`, so no Settings model
 * is required. Templates live in `src/email/templates/*.ejs` and are copied
 * to `dist/` by nest-cli (see nest-cli.json assets).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Resolve the storefront base URL for building links in emails. `env.FRONTEND_URL`
   * already returns the prod list in production and the dev list otherwise; it may
   * be a comma-separated list, so pick the first non-admin entry.
   */
  private getClientBaseUrl(): string {
    const raw = env.FRONTEND_URL || 'http://localhost:3000';
    const urls = raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const storefront = urls.find((u) => !/admin/i.test(u));
    return storefront || urls[0] || 'http://localhost:3000';
  }

  private getTransporter() {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  private async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, unknown>,
    rethrow = false,
  ): Promise<void> {
    try {
      const templateData = {
        ...data,
        storeName: env.STORE_NAME,
        currentYear: new Date().getFullYear(),
      };

      const templatePath = path.join(__dirname, 'templates', templateName);
      const html = await ejs.renderFile(templatePath, templateData);

      const mailOptions = {
        from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
        to,
        subject,
        html,
      };

      const transporter = this.getTransporter();
      await transporter.sendMail(mailOptions);
      this.logger.log(`Email '${subject}' sent successfully to ${to}`);
    } catch (error) {
      // Never log OTP values or template data — only the failure.
      this.logger.error(`Failed to send email '${subject}' to ${to}`, error);
      if (rethrow) {
        throw new Error('Failed to send email');
      }
    }
  }

  /**
   * Deliver a one-time code. `rethrow` is true so the OTP flow fails loudly
   * if the email can't be sent (the user would otherwise wait for a code that
   * never arrives).
   */
  async sendOtpEmail(
    email: string,
    code: string,
    opts: { title: string; intro: string; expiryMinutes: number },
  ): Promise<void> {
    await this.sendTemplateEmail(
      email,
      `${opts.title} - ${env.STORE_NAME}`,
      'otp.ejs',
      {
        otp: code,
        title: opts.title,
        intro: opts.intro,
        expiryMinutes: opts.expiryMinutes,
      },
      true,
    );
  }

  /**
   * Email a single-use password-reset LINK. `rethrow` is false so a delivery
   * failure never propagates: forgot-password must always return the same
   * generic response, otherwise a 500 (send failed) vs 200 (no account) would
   * let callers enumerate which emails exist.
   */
  async sendResetPasswordEmail(
    email: string,
    token: string,
    name?: string,
  ): Promise<void> {
    const baseUrl = this.getClientBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(
      email,
    )}`;
    await this.sendTemplateEmail(
      email,
      `Reset your password - ${env.STORE_NAME}`,
      'reset-password.ejs',
      {
        name: name || 'there',
        resetUrl,
        expiryMinutes: env.RESET_TOKEN_EXPIRY_MINUTES,
      },
    );
  }

  async sendWelcomeEmail(email: string, name?: string): Promise<void> {
    await this.sendTemplateEmail(
      email,
      `Welcome to ${env.STORE_NAME}!`,
      'welcome.ejs',
      { name: name || 'there' },
    );
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.getTransporter().verify();
      this.logger.log('SMTP connection verified successfully.');
      return true;
    } catch (error) {
      this.logger.error('Failed to verify SMTP connection:', error);
      return false;
    }
  }
}
