import { Injectable } from '@nestjs/common';
import { PaymentSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentSettingsDto } from './dto/update-payment-settings.dto';
import { decryptSecret, encryptSecret } from '../common/crypto.util';

/** What the storefront is allowed to know about payment configuration. */
export interface PublicPaymentMethods {
  /** Pay the whole order on delivery. */
  cod: boolean;
  /** Pay the whole order online via Razorpay. */
  razorpay: boolean;
  /**
   * Razorpay's PUBLISHABLE key, needed to open the browser checkout. Only
   * present when Razorpay is actually usable; never the secret.
   */
  razorpayKeyId?: string;
}

/** The admin's view: everything except the secret itself. */
export type AdminPaymentSettings = Omit<PaymentSettings, 'razorpayKeySecret'> & {
  isRazorpaySecretSet: boolean;
};

/**
 * PaymentsService — the payment configuration singleton behind the admin's
 * Settings → Payments screen.
 *
 * The Razorpay secret is encrypted at rest and never leaves this service
 * except through `getRazorpayCredentials()`, which only RazorpayService calls.
 */
@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The settings row, creating it with defaults on first access. */
  async get(): Promise<PaymentSettings> {
    const existing = await this.prisma.paymentSettings.findFirst();
    if (existing) return existing;
    return this.prisma.paymentSettings.create({ data: {} });
  }

  /** Admin view — the secret is replaced by a boolean. */
  async getForAdmin(): Promise<AdminPaymentSettings> {
    const { razorpayKeySecret, ...rest } = await this.get();
    return { ...rest, isRazorpaySecretSet: Boolean(razorpayKeySecret) };
  }

  /**
   * What checkout may offer. Razorpay only counts as available when it's
   * switched on AND both halves of the credential are present — a toggle with
   * no keys behind it would send the customer to a checkout that can't open.
   */
  async getPublicMethods(): Promise<PublicPaymentMethods> {
    const settings = await this.get();
    const razorpayUsable =
      settings.razorpayEnabled &&
      Boolean(settings.razorpayKeyId) &&
      Boolean(settings.razorpayKeySecret);

    return {
      cod: settings.codEnabled,
      razorpay: razorpayUsable,
      ...(razorpayUsable
        ? { razorpayKeyId: settings.razorpayKeyId ?? undefined }
        : {}),
    };
  }

  /**
   * Admin: patch the settings. An omitted or blank `razorpayKeySecret` keeps
   * the stored one — the form can't show it, so it can't send it back, and
   * treating "" as "clear it" would wipe the key on every unrelated save.
   */
  async update(dto: UpdatePaymentSettingsDto): Promise<AdminPaymentSettings> {
    const current = await this.get();
    const { razorpayKeySecret, ...rest } = dto;

    await this.prisma.paymentSettings.update({
      where: { id: current.id },
      data: {
        ...rest,
        ...(razorpayKeySecret
          ? { razorpayKeySecret: encryptSecret(razorpayKeySecret) }
          : {}),
      },
    });

    return this.getForAdmin();
  }

  /**
   * The live credentials, decrypted. RazorpayService is the only caller —
   * nothing here is ever serialised into a response.
   */
  async getRazorpayCredentials(): Promise<{
    keyId: string;
    keySecret: string;
  }> {
    const settings = await this.get();
    return {
      keyId: settings.razorpayKeyId ?? '',
      keySecret: decryptSecret(settings.razorpayKeySecret),
    };
  }
}
