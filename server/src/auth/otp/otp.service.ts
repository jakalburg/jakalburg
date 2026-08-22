import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { env } from '../../config/env';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/auth.constant';

const PURPOSE_META: Record<OtpPurpose, { title: string; intro: string }> = {
  [OtpPurpose.SIGNUP_VERIFICATION]: {
    title: 'Verify your email',
    intro:
      'Use the verification code below to confirm your email address and activate your account.',
  },
  [OtpPurpose.PASSWORD_RESET]: {
    title: 'Reset your password',
    intro: 'Use the code below to reset the password for your account.',
  },
};

/**
 * Hardened OTP service (per auth.md §4/§13). Diverges from the reference's
 * minimal Otp model:
 *  - purpose-scoped (SIGNUP_VERIFICATION vs PASSWORD_RESET never cross over)
 *  - only a bcrypt HASH of the code is stored (raw code never persisted/logged/returned)
 *  - expiry, attempt limit, and resend cooldown are all enforced
 *  - a new code invalidates the previous one; a verified code is single-use
 */
@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private normalize(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateCode(): string {
    // Cryptographically strong 6-digit code (000000–999999).
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /**
   * Generate a fresh OTP for (email, purpose), enforce the resend cooldown,
   * invalidate any previous code, and email the new one.
   */
  async generateAndSend(email: string, purpose: OtpPurpose): Promise<void> {
    const emailNorm = this.normalize(email);

    // Resend cooldown — based on the most recent active code for this purpose.
    const latest = await this.prisma.otp.findFirst({
      where: { email: emailNorm, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest) {
      const elapsedSeconds =
        (Date.now() - latest.lastSentAt.getTime()) / 1000;
      const cooldown = env.OTP_RESEND_COOLDOWN_SECONDS;
      if (elapsedSeconds < cooldown) {
        const wait = Math.ceil(cooldown - elapsedSeconds);
        throw new HttpException(
          `Please wait ${wait} second(s) before requesting another code.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Invalidate every previous code for this (email, purpose).
    await this.prisma.otp.deleteMany({ where: { email: emailNorm, purpose } });

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.otp.create({
      data: {
        email: emailNorm,
        purpose,
        codeHash,
        expiresAt,
        attempts: 0,
        maxAttempts: env.OTP_MAX_ATTEMPTS,
        lastSentAt: new Date(),
      },
    });

    const meta = PURPOSE_META[purpose];
    await this.emailService.sendOtpEmail(emailNorm, code, {
      title: meta.title,
      intro: meta.intro,
      expiryMinutes: env.OTP_EXPIRY_MINUTES,
    });
  }

  /**
   * Verify a submitted code for (email, purpose). On success the code is
   * consumed (single-use). Throws a safe BadRequest on any failure.
   */
  async verify(
    email: string,
    purpose: OtpPurpose,
    code: string,
  ): Promise<void> {
    const emailNorm = this.normalize(email);

    const otp = await this.prisma.otp.findFirst({
      where: { email: emailNorm, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired verification code.');
    }

    if (new Date() > otp.expiresAt) {
      await this.prisma.otp.delete({ where: { id: otp.id } });
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    if (otp.attempts >= otp.maxAttempts) {
      await this.prisma.otp.delete({ where: { id: otp.id } });
      throw new BadRequestException(
        'Too many incorrect attempts. Please request a new code.',
      );
    }

    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      const attempts = otp.attempts + 1;
      if (attempts >= otp.maxAttempts) {
        // Burn the code once the attempt limit is reached.
        await this.prisma.otp.delete({ where: { id: otp.id } });
      } else {
        await this.prisma.otp.update({
          where: { id: otp.id },
          data: { attempts },
        });
      }
      throw new BadRequestException('Invalid verification code.');
    }

    // Success — mark consumed (single-use).
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  // ─── Password-reset link tokens ────────────────────────────────────────────
  //
  // The reset flow uses an emailed single-use LINK rather than a 6-digit code.
  // We reuse the same hardened Otp row (purpose PASSWORD_RESET), but the stored
  // value is a long, high-entropy token instead of a guessable code. Only its
  // bcrypt hash is persisted (raw token is never stored/logged); it is single-
  // use (consumedAt) and expiry-bound like every other OTP.

  private generateResetToken(): string {
    // 256 bits of entropy, URL-safe hex (well under bcrypt's 72-byte input).
    return randomBytes(32).toString('hex');
  }

  /**
   * Mint a fresh password-reset token for `email`, invalidating any previous
   * one, and return the RAW token so the caller can embed it in a reset link.
   * No resend cooldown is enforced here: forgot-password must stay generic to
   * avoid account enumeration (rate limiting is handled by the controller's
   * IP-based throttle), so this never throws for an existing account.
   */
  async createResetToken(email: string): Promise<string> {
    const emailNorm = this.normalize(email);

    // Invalidate every previous reset token for this email.
    await this.prisma.otp.deleteMany({
      where: { email: emailNorm, purpose: OtpPurpose.PASSWORD_RESET },
    });

    const token = this.generateResetToken();
    const codeHash = await bcrypt.hash(token, BCRYPT_SALT_ROUNDS);
    const expiresAt = new Date(
      Date.now() + env.RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    await this.prisma.otp.create({
      data: {
        email: emailNorm,
        purpose: OtpPurpose.PASSWORD_RESET,
        codeHash,
        expiresAt,
        attempts: 0,
        maxAttempts: env.OTP_MAX_ATTEMPTS,
        lastSentAt: new Date(),
      },
    });

    return token;
  }

  /**
   * Validate and consume a password-reset token (single-use). Throws a safe,
   * link-oriented BadRequest on any failure. Hitting this with a bad token
   * reveals nothing about whether the email exists.
   */
  async consumeResetToken(email: string, token: string): Promise<void> {
    const emailNorm = this.normalize(email);
    const invalid = new BadRequestException(
      'This password reset link is invalid or has expired. Please request a new one.',
    );

    const otp = await this.prisma.otp.findFirst({
      where: {
        email: emailNorm,
        purpose: OtpPurpose.PASSWORD_RESET,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw invalid;

    if (new Date() > otp.expiresAt) {
      await this.prisma.otp.delete({ where: { id: otp.id } });
      throw invalid;
    }

    const matches = await bcrypt.compare(token, otp.codeHash);
    if (!matches) throw invalid;

    // Success — mark consumed (single-use).
    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }
}
