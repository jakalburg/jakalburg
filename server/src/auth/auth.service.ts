import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { OtpService } from './otp/otp.service';
import { env } from '../config/env';
import { BCRYPT_SALT_ROUNDS } from '../common/constants/auth.constant';
import { UserWithRelations } from '../types/database.types';
import {
  GoogleUserData,
  AuthResponseDto,
  UserResponseDto,
  JwtPayload,
} from './dto/auth-response.dto';
import { RegisterDto } from './dto/email-auth.dto';

const GENERIC_RESET_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private otpService: OtpService,
  ) {
    this.googleClient = new OAuth2Client();
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private getProviders(user: { providers?: string[] | null }): string[] {
    return Array.isArray(user.providers) ? user.providers : [];
  }

  private async addProvider(
    userId: string,
    existing: string[],
    newProvider: string,
  ): Promise<void> {
    if (existing.includes(newProvider)) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { providers: [...existing, newProvider] },
    });
  }

  // ─── Core session helpers ────────────────────────────────────────────────

  async login(user: UserWithRelations): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      email: user.email!,
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };
    return {
      user: this.buildUserResponse(user),
      accessToken: this.jwtService.sign(payload),
    };
  }

  async getUserById(userId: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true, profiles: true },
    }) as unknown as Promise<UserWithRelations | null>;
  }

  public buildUserResponse(user: UserWithRelations): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hasPassword: !!user.password,
      providers: this.getProviders(user),
      accounts: user.accounts || [],
      profiles: user.profiles || [],
    };
  }

  // ─── Email / Password sign up ──────────────────────────────────────────────

  /**
   * Register a new email/password user and email a SIGNUP_VERIFICATION OTP.
   * The account is created unverified; login is blocked until the OTP is
   * verified via verifyEmail().
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const email = registerDto.email.trim().toLowerCase();
    const { password, firstName, lastName } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const currentProviders = this.getProviders(existingUser);

      if (currentProviders.includes('email')) {
        if (existingUser.emailVerified) {
          throw new BadRequestException(
            'An account with this email already exists. Please log in instead.',
          );
        }
        // Registered before but never verified — refresh password + resend OTP.
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { password: hashedPassword },
        });
        await this.otpService.generateAndSend(
          email,
          OtpPurpose.SIGNUP_VERIFICATION,
        );
        return {
          message:
            'Account already pending verification. A new verification code has been sent.',
        };
      }

      // Exists via an OAuth provider only (no password). In this app that's
      // Google — tell them to sign in with Google rather than create a duplicate.
      if (currentProviders.includes('google')) {
        throw new BadRequestException(
          'An account with this email already exists through Google. ' +
            'Please sign in with Google.',
        );
      }
      const providerNames = currentProviders.length
        ? currentProviders.join(', ')
        : 'another method';
      throw new BadRequestException(
        `This email is already registered via ${providerNames}. ` +
          'Please sign in with that method.',
      );
    }

    // Brand-new user.
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: null,
        providers: ['email'],
        profiles: { create: { firstName, lastName } },
        accounts: {
          create: {
            type: 'credentials',
            provider: 'email',
            providerAccountId: email,
          },
        },
      },
    });

    await this.otpService.generateAndSend(email, OtpPurpose.SIGNUP_VERIFICATION);

    return {
      message:
        'Registration successful! A verification code has been sent to your email.',
    };
  }

  /**
   * Verify the signup OTP. Marks the email verified, ensures the email
   * provider is linked, sends a welcome email, and returns a session.
   */
  async verifyEmail(
    emailRaw: string,
    otp: string,
  ): Promise<AuthResponseDto> {
    const email = emailRaw.trim().toLowerCase();

    await this.otpService.verify(email, OtpPurpose.SIGNUP_VERIFICATION, otp);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true, profiles: true },
    });
    if (!user) {
      throw new BadRequestException('Account not found. Please sign up again.');
    }

    const currentProviders = this.getProviders(user);
    const data: any = {};
    if (!user.emailVerified) data.emailVerified = new Date();
    if (!currentProviders.includes('email')) {
      data.providers = [...currentProviders, 'email'];
    }

    const hasEmailAccount = user.accounts.some((a) => a.provider === 'email');
    if (!hasEmailAccount) {
      await this.prisma.account.create({
        data: {
          userId: user.id,
          type: 'credentials',
          provider: 'email',
          providerAccountId: email,
        },
      });
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data });
    }

    await this.emailService.sendWelcomeEmail(
      email,
      user.profiles[0]?.firstName || undefined,
    );

    const refreshed = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { accounts: true, profiles: true },
    });

    return this.login(refreshed as unknown as UserWithRelations);
  }

  /**
   * Resend an OTP. Uses generic responses so it can't be used to enumerate
   * which emails have accounts.
   */
  async resendOtp(
    emailRaw: string,
    purpose: OtpPurpose,
  ): Promise<{ message: string }> {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (purpose === OtpPurpose.SIGNUP_VERIFICATION) {
      // Only (re)send if there is an unverified account to verify.
      if (user && !user.emailVerified) {
        await this.otpService.generateAndSend(email, purpose);
      }
      return {
        message:
          'If your account is awaiting verification, a new code has been sent.',
      };
    }

    // PASSWORD_RESET — resend goes through the same reset-link path so callers
    // always receive a link (never a stale 6-digit code) and the same generic
    // response.
    await this.sendPasswordResetLink(email);
    return { message: GENERIC_RESET_MESSAGE };
  }

  // ─── Email / Password login ────────────────────────────────────────────────

  async loginWithPassword(
    emailRaw: string,
    password: string,
  ): Promise<AuthResponseDto> {
    const email = emailRaw.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true, profiles: true },
    });

    // No account for this email — steer them to sign up. (Enumeration via login
    // isn't a new exposure: register already reveals whether an email is taken.
    // The forgot-password flow stays generic, which is the guard that matters.)
    if (!user) {
      throw new UnauthorizedException(
        'No account found with this email. Please sign up first.',
      );
    }

    if (user.disabled) {
      throw new UnauthorizedException('This account has been disabled.');
    }

    if (!user.password) {
      const otherProviders = this.getProviders(user).filter(
        (p) => p !== 'email',
      );
      if (otherProviders.length) {
        throw new BadRequestException(
          `This account uses ${otherProviders.join(', ')} to sign in.`,
        );
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Incorrect password. Please try again.');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the verification code.',
      );
    }

    return this.login(user as unknown as UserWithRelations);
  }

  // ─── Password management ───────────────────────────────────────────────────

  async setPassword(
    userId: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const currentProviders = this.getProviders(user);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        providers: currentProviders.includes('email')
          ? currentProviders
          : [...currentProviders, 'email'],
      },
    });

    return {
      message:
        'Password set successfully. You can now log in with email and password.',
    };
  }

  async hasPassword(userId: string): Promise<{ hasPassword: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });
    return { hasPassword: !!user?.password };
  }

  async changePassword(
    userId: string,
    currentPassword: string | undefined,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, providers: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    if (user.password) {
      if (!currentPassword)
        throw new BadRequestException('Current password is required');
      const matches = await bcrypt.compare(currentPassword, user.password);
      if (!matches)
        throw new UnauthorizedException('Current password is incorrect');
      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame)
        throw new BadRequestException('New password must be different');
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const currentProviders = this.getProviders(user);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashed,
        providers: currentProviders.includes('email')
          ? currentProviders
          : [...currentProviders, 'email'],
      },
    });

    return {
      message: user.password
        ? 'Password changed successfully.'
        : 'Password set successfully.',
    };
  }

  // ─── Password reset (emailed reset LINK) ─────────────────────────────────────

  /**
   * Mint a reset token and email a single-use reset link — but only for an
   * account that actually exists AND is verified. An unverified account is
   * treated exactly like a non-existent one (no link sent): there is no
   * verified identity to trust yet, and it keeps the response indistinguishable.
   * Silently no-ops otherwise. Callers must still return the generic message.
   */
  private async sendPasswordResetLink(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profiles: true },
    });

    if (!user || !user.emailVerified) return;

    const token = await this.otpService.createResetToken(email);
    await this.emailService.sendResetPasswordEmail(
      email,
      token,
      user.profiles[0]?.firstName || undefined,
    );
  }

  /** Always returns a generic response so emails can't be enumerated. */
  async forgotPassword(emailRaw: string): Promise<{ message: string }> {
    const email = emailRaw.trim().toLowerCase();
    await this.sendPasswordResetLink(email);
    return { message: GENERIC_RESET_MESSAGE };
  }

  /**
   * Consume a reset-link token and set the new password. Invalidates every
   * previously issued session (tokenVersion bump).
   */
  async resetPassword(
    emailRaw: string,
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const email = emailRaw.trim().toLowerCase();

    await this.otpService.consumeResetToken(email, token);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Please request a new one.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    const currentProviders = this.getProviders(user);

    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        emailVerified: user.emailVerified ?? new Date(),
        providers: currentProviders.includes('email')
          ? currentProviders
          : [...currentProviders, 'email'],
        // Invalidate every previously issued session (auth.md §8).
        tokenVersion: { increment: 1 },
      },
    });

    return {
      message:
        'Password has been reset successfully. Please log in with your new password.',
    };
  }

  // ─── Google One Tap ──────────────────────────────────────────────────────

  async verifyGoogleOneTap(credential: string): Promise<GoogleUserData> {
    try {
      const clientId = env.GOOGLE_CLIENT_ID;
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google credential');
      }

      const { sub, email, email_verified, given_name, family_name, picture } =
        payload;

      if (!email) {
        throw new UnauthorizedException('Email not provided by Google');
      }
      if (!email_verified) {
        throw new UnauthorizedException(
          'Google account email is not verified.',
        );
      }

      return {
        provider: 'google',
        providerId: sub,
        email: email.toLowerCase(),
        emailVerified: true,
        firstName: given_name || '',
        lastName: family_name || '',
        picture: picture || '',
        accessToken: '',
        refreshToken: '',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid Google credential');
    }
  }

  /**
   * Google One Tap LOGIN — always succeeds, never denies:
   *  - Case A: no user for this Google identity and no account for this email →
   *    create a Google-only user and sign in.
   *  - Case B: this Google identity is already linked → sign that user in.
   *  - Case C: an account with this email already exists (e.g. email/password)
   *    but Google isn't linked yet → MERGE: link Google onto that account and
   *    sign in. Safe because verifyGoogleOneTap only accepts Google credentials
   *    with a verified email, so email ownership is proven by Google.
   *
   * Case E (a Google identity owned by another user) cannot arise here: the
   * (provider, providerAccountId) pair is unique, so a linked identity always
   * resolves to its single owner — exactly who Case B signs in.
   */
  async validateGoogleUser(
    googleUser: GoogleUserData,
  ): Promise<UserWithRelations> {
    const { email, providerId, provider, firstName, lastName, picture } =
      googleUser;

    // Case B: this Google identity is already linked — sign in the owner.
    const linked = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId: providerId },
      },
      select: { userId: true },
    });
    if (linked) {
      const user = await this.prisma.user.findUnique({
        where: { id: linked.userId },
        include: { accounts: true, profiles: true },
      });
      // Cascade delete keeps accounts and users in lock-step; a missing user
      // here would mean a corrupt row — refuse rather than guess.
      if (!user) throw new UnauthorizedException('Invalid Google credential');
      if (user.disabled) {
        throw new UnauthorizedException('This account has been disabled.');
      }
      return user as unknown as UserWithRelations;
    }

    // Case C: an account already exists for this (Google-verified) email but
    // Google isn't linked yet → MERGE. Link the Google identity onto that
    // account, backfill anything missing, and sign in.
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { accounts: true, profiles: true },
    });
    if (existing) {
      if (existing.disabled) {
        throw new UnauthorizedException('This account has been disabled.');
      }

      await this.prisma.account.create({
        data: {
          userId: existing.id,
          type: 'oauth',
          provider,
          providerAccountId: providerId,
          token_type: 'Bearer',
          scope: 'email profile',
        },
      });
      await this.addProvider(existing.id, this.getProviders(existing), 'google');

      // Backfill only what's missing — never clobber user-set data.
      const data: any = {};
      if (!existing.emailVerified) data.emailVerified = new Date();
      if (picture && !existing.image) data.image = picture;
      if (Object.keys(data).length > 0) {
        await this.prisma.user.update({ where: { id: existing.id }, data });
      }
      if (existing.profiles.length === 0) {
        await this.prisma.profile.create({
          data: {
            userId: existing.id,
            firstName: firstName || null,
            lastName: lastName || null,
          },
        });
      }

      const merged = await this.prisma.user.findUnique({
        where: { id: existing.id },
        include: { accounts: true, profiles: true },
      });
      return (merged ?? existing) as unknown as UserWithRelations;
    }

    // Case A: brand-new user — create a Google-only account and sign in.
    const user = await this.prisma.user.create({
      data: {
        email,
        image: picture || null,
        emailVerified: new Date(),
        password: null,
        providers: ['google'],
        accounts: {
          create: {
            type: 'oauth',
            provider,
            providerAccountId: providerId,
            token_type: 'Bearer',
            scope: 'email profile',
          },
        },
        profiles: {
          create: { firstName: firstName || null, lastName: lastName || null },
        },
      },
      include: { accounts: true, profiles: true },
    });

    return user as unknown as UserWithRelations;
  }

  /**
   * Connect a Google identity to the ALREADY-AUTHENTICATED user (the account
   * settings "Connect Google" action). The caller has proven ownership of
   * `userId` via their JWT; we only link after verifying the Google ID token.
   *  - The verified Google email must equal the account email (the email is the
   *    fixed identity anchor — it cannot be changed from the profile).
   *  - Case E: refuse if the Google identity is already linked to a different
   *    user. Never merge two accounts.
   *  - Idempotent when it is already linked to this same user.
   */
  async linkGoogleAccount(
    userId: string,
    googleUser: GoogleUserData,
  ): Promise<UserWithRelations> {
    const { email, providerId, provider, picture } = googleUser;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true, profiles: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    // The Google account must match this account's email.
    if ((user.email ?? '').toLowerCase() !== email) {
      throw new BadRequestException(
        'That Google account uses a different email. Connect the Google ' +
          'account that matches your account email.',
      );
    }

    // Is this Google identity already linked somewhere?
    const existing = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId: providerId },
      },
      select: { userId: true },
    });
    if (existing) {
      if (existing.userId !== userId) {
        // Case E: linked to someone else — never merge accounts.
        throw new ConflictException(
          'This Google account is already connected to a different account.',
        );
      }
      // Already connected to this user — nothing to do.
      return user as unknown as UserWithRelations;
    }

    await this.prisma.account.create({
      data: {
        userId,
        type: 'oauth',
        provider,
        providerAccountId: providerId,
        token_type: 'Bearer',
        scope: 'email profile',
      },
    });
    await this.addProvider(userId, this.getProviders(user), 'google');
    if (picture && !user.image) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { image: picture },
      });
    }

    const refreshed = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true, profiles: true },
    });
    return (refreshed ?? user) as unknown as UserWithRelations;
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(): Promise<{ message: string; success: boolean }> {
    // JWT is stateless; logout is a client-side token discard. (Kept as an
    // endpoint for parity and future server-side session revocation.)
    return { message: 'Logged out successfully', success: true };
  }
}
