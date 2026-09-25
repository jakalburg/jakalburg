import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import { env } from '../config/env';

/** One ordered line, shaped for the order email templates. */
export interface OrderEmailItem {
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  /** Whole INR (no paise) — matches the store's integer pricing. */
  unitPrice: number;
  lineTotal: number;
}

/** Everything the order email templates need, decoupled from Prisma types. */
export interface OrderEmailData {
  orderNumber: string;
  /** Internal DB id — used to build the admin deep link. */
  orderId: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  paymentLabel: string;
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode?: string | null;
  total: number;
  items: OrderEmailItem[];
}

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

  /**
   * Resolve the admin dashboard base URL for the "View order" link in the owner
   * notification. `env.FRONTEND_URL` lists both origins; the admin one is tagged
   * by hostname (`admin…`) in prod and by port (`:4000`) in dev.
   */
  private getAdminBaseUrl(): string {
    const raw = env.FRONTEND_URL || 'http://localhost:4000';
    const urls = raw
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const admin = urls.find((u) => /admin/i.test(u) || /:4000(\b|\/|$)/.test(u));
    return admin || 'http://localhost:4000';
  }

  private formatInr(n: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n || 0);
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Add pre-formatted currency strings so templates stay logic-free. */
  private toTemplateItems(items: OrderEmailItem[]) {
    return items.map((i) => ({
      ...i,
      unitPriceFormatted: this.formatInr(i.unitPrice),
      lineTotalFormatted: this.formatInr(i.lineTotal),
    }));
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

  /**
   * Render + send one template. Returns whether delivery succeeded so callers
   * can report `emailSent` honestly. With `rethrow` false (the default) a
   * failure is swallowed and returns false — transactional side-effects such as
   * checkout or a status change must never fail because SMTP hiccuped.
   */
  private async sendTemplateEmail(
    to: string,
    subject: string,
    templateName: string,
    data: Record<string, unknown>,
    rethrow = false,
  ): Promise<boolean> {
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
      return true;
    } catch (error) {
      // Never log OTP values or template data — only the failure.
      this.logger.error(`Failed to send email '${subject}' to ${to}`, error);
      if (rethrow) {
        throw new Error('Failed to send email');
      }
      return false;
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

  /**
   * Order confirmation to the customer, sent on checkout. Delivery failures are
   * swallowed (returns false) so a flaky SMTP never breaks placing an order.
   */
  async sendOrderPlacedCustomerEmail(order: OrderEmailData): Promise<boolean> {
    const orderUrl = `${this.getClientBaseUrl()}/account/orders/${encodeURIComponent(
      order.orderNumber,
    )}`;
    return this.sendTemplateEmail(
      order.customerEmail,
      `Order confirmed · ${order.orderNumber} — ${env.STORE_NAME}`,
      'order-placed-user.ejs',
      {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        orderDate: this.formatDate(order.createdAt),
        paymentLabel: order.paymentLabel,
        items: this.toTemplateItems(order.items),
        subtotal: this.formatInr(order.subtotal),
        shipping: this.formatInr(order.shipping),
        discount: order.discount > 0 ? this.formatInr(order.discount) : null,
        couponCode: order.couponCode || null,
        total: this.formatInr(order.total),
        orderUrl,
      },
    );
  }

  /** New-order notification to the store owner (OWNER_EMAIL), sent on checkout. */
  async sendOrderPlacedOwnerEmail(order: OrderEmailData): Promise<boolean> {
    const adminOrderUrl = `${this.getAdminBaseUrl()}/orders/${encodeURIComponent(
      order.orderId,
    )}`;
    return this.sendTemplateEmail(
      env.OWNER_EMAIL,
      `New order · ${order.orderNumber} — ${env.STORE_NAME}`,
      'order-placed-admin.ejs',
      {
        orderNumber: order.orderNumber,
        orderDate: this.formatDate(order.createdAt),
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        paymentLabel: order.paymentLabel,
        items: this.toTemplateItems(order.items),
        total: this.formatInr(order.total),
        adminOrderUrl,
      },
    );
  }

  /**
   * Unified order-status-update email to the customer. Sent when an admin
   * changes an order's status with "Notify customer" checked. `status` is the
   * stored enum value (processing | shipped | delivered).
   */
  async sendOrderStatusUpdateEmail(
    order: OrderEmailData,
    status: string,
  ): Promise<boolean> {
    const labels: Record<string, string> = {
      processing: 'Processing',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      returned: 'Returned',
      refunded: 'Refunded',
    };
    const messages: Record<string, string> = {
      processing: "We're preparing your order for dispatch.",
      shipped: 'Good news — your order is on its way.',
      delivered: 'Your order has been delivered. We hope you love it!',
      cancelled:
        'Your order has been cancelled. Any payment made will be refunded per our policy.',
      returned: "We've received your return.",
      refunded: 'Your refund has been processed.',
    };
    const orderUrl = `${this.getClientBaseUrl()}/account/orders/${encodeURIComponent(
      order.orderNumber,
    )}`;
    return this.sendTemplateEmail(
      order.customerEmail,
      `Order ${order.orderNumber} is ${labels[status] || 'updated'} — ${env.STORE_NAME}`,
      'order-status-update-user.ejs',
      {
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        status,
        statusLabel: labels[status] || status,
        statusMessage:
          messages[status] || 'Your order status has been updated.',
        orderDate: this.formatDate(order.createdAt),
        total: this.formatInr(order.total),
        items: this.toTemplateItems(order.items),
        orderUrl,
      },
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
