import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import {
  AuthResponseDto,
  MessageResponseDto,
  LogoutResponseDto,
  MeResponseDto,
  HasPasswordResponseDto,
} from './dto/auth-response.dto';
import { UserWithRelations } from '../types/database.types';
import {
  RegisterDto,
  VerifyEmailDto,
  ResendOtpDto,
  LoginWithPasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SetPasswordDto,
  ChangePasswordDto,
} from './dto/email-auth.dto';
import { GoogleOneTapDto } from './dto/google-one-tap.dto';
import { AllowDuringMaintenance } from '../maintenance/allow-during-maintenance.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ApiKeyGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration & email verification ─────────────────────────────────────

  /** Register a new email/password user and email a signup OTP. */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Register a new email/password user',
    description:
      'Creates an unverified account and emails a 6-digit signup OTP. Finish via POST /auth/verify-email.',
  })
  @ApiCreatedResponse({ description: 'Signup OTP sent.', type: MessageResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation failed (e.g. password < 8 chars) or email already registered.',
  })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (5 requests / minute).' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string }> {
    return this.authService.register(registerDto);
  }

  /** Verify the signup OTP and return a session (JWT + user). */
  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Verify signup OTP and sign in',
    description: 'Verifies the signup code and returns a JWT + user on success.',
  })
  @ApiCreatedResponse({ description: 'Verified; session issued.', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired code.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (10 / minute).' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<AuthResponseDto> {
    return this.authService.verifyEmail(dto.email, dto.otp);
  }

  /** Resend an OTP (signup verification or password reset). */
  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Resend an OTP',
    description: 'Resends a signup-verification or password-reset code.',
  })
  @ApiCreatedResponse({ description: 'A new code was sent (if applicable).', type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (3 / minute).' })
  async resendOtp(
    @Body() dto: ResendOtpDto,
  ): Promise<{ message: string }> {
    return this.authService.resendOtp(dto.email, dto.purpose);
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  /** Log in with email + password. */
  // Open during maintenance: an admin must be able to sign in to turn
  // maintenance OFF. A customer signing in here still gets 503 from every
  // other route, so this grants no storefront access.
  @AllowDuringMaintenance()
  @Post('login-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with email + password' })
  @ApiCreatedResponse({ description: 'Signed in; JWT + user returned.', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or email not verified.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (10 / minute).' })
  async loginWithPassword(
    @Body() loginDto: LoginWithPasswordDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithPassword(
      loginDto.email,
      loginDto.password,
    );
  }

  /** Google One Tap: verify the credential, find-or-create the user, sign in. */
  @Post('google/callback')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Google One Tap sign-in',
    description:
      'Verifies the Google ID-token credential, finds-or-creates the user, and returns a session.',
  })
  @ApiCreatedResponse({ description: 'Signed in; JWT + user returned.', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid Google credential.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (20 / minute).' })
  async googleOneTapCallback(
    @Body() googleOneTapDto: GoogleOneTapDto,
  ): Promise<AuthResponseDto> {
    const googleUser = await this.authService.verifyGoogleOneTap(
      googleOneTapDto.credential,
    );
    const user = await this.authService.validateGoogleUser(googleUser);
    return this.authService.login(user);
  }

  /** Connect a Google account to the authenticated user (account settings). */
  @Post('google/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Connect a Google account to the current user',
    description:
      'Verifies a Google ID-token credential and links that Google identity to ' +
      'the authenticated user. The Google email must match the account email; a ' +
      'Google identity already linked to another user is rejected (never merged).',
  })
  @ApiCreatedResponse({ description: 'Google connected; updated user returned.', type: MeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid credential or the Google email does not match.' })
  @ApiUnauthorizedResponse({ description: 'Missing/invalid token or invalid Google credential.' })
  async linkGoogle(
    @Req() req: Request,
    @Body() googleOneTapDto: GoogleOneTapDto,
  ): Promise<{ user: ReturnType<AuthService['buildUserResponse']> }> {
    const authUser = req.user as UserWithRelations;
    const googleUser = await this.authService.verifyGoogleOneTap(
      googleOneTapDto.credential,
    );
    const updated = await this.authService.linkGoogleAccount(
      authUser.id,
      googleUser,
    );
    return { user: this.authService.buildUserResponse(updated) };
  }

  // ─── Password reset (emailed reset LINK) ─────────────────────────────────────

  /** Request a password-reset link. Always returns a generic message. */
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Request a password-reset link',
    description:
      'Emails a single-use, expiring reset link (only for an existing, verified account). ' +
      'Always returns a generic message so callers cannot tell whether the email exists.',
  })
  @ApiCreatedResponse({ description: 'Generic acknowledgement.', type: MessageResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (3 / minute).' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  /** Reset the password with a valid reset-link token. Invalidates existing sessions. */
  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Reset password with a reset-link token',
    description:
      'Consumes the single-use token from the emailed reset link (`token` + `email` query ' +
      'params) and sets a new password. The token can be used only once. Invalidates existing sessions.',
  })
  @ApiCreatedResponse({ description: 'Password reset.', type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired reset link.' })
  @ApiTooManyRequestsResponse({ description: 'Rate limited (10 / minute).' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(
      dto.email,
      dto.token,
      dto.newPassword,
    );
  }

  // ─── Authenticated account management ──────────────────────────────────────

  /** Return the current authenticated user. */
  // Open during maintenance: an admin must be able to sign in to turn
  // maintenance OFF. A customer signing in here still gets 503 from every
  // other route, so this grants no storefront access.
  @AllowDuringMaintenance()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkResponse({ description: 'The authenticated user.', type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async getCurrentUser(
    @Req() req: Request,
  ): Promise<{ user: ReturnType<AuthService['buildUserResponse']> }> {
    const user = req.user as UserWithRelations;
    return { user: this.authService.buildUserResponse(user) };
  }

  /** Log out (stateless — client discards the token). */
  // Open during maintenance: an admin must be able to sign in to turn
  // maintenance OFF. A customer signing in here still gets 503 from every
  // other route, so this grants no storefront access.
  @AllowDuringMaintenance()
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Log out', description: 'Stateless — the client discards the token.' })
  @ApiCreatedResponse({ description: 'Logged out.', type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async logout(): Promise<{ message: string; success: boolean }> {
    return this.authService.logout();
  }

  /** Set a password for an account that has none (e.g. Google-only). */
  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Set a password on an account that has none' })
  @ApiCreatedResponse({ description: 'Password set.', type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or a password already exists.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async setPassword(
    @Req() req: Request,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ message: string }> {
    const user = req.user as UserWithRelations;
    return this.authService.setPassword(user.id, setPasswordDto.password);
  }

  /** Change the authenticated user's password. */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: "Change the authenticated user's password" })
  @ApiCreatedResponse({ description: 'Password changed.', type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or current password incorrect.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async changePassword(
    @Req() req: Request,
    @Body() body: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = req.user as UserWithRelations;
    return this.authService.changePassword(
      user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  /** Report whether the authenticated user has a password set. */
  @Get('has-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Whether the authenticated user has a password set' })
  @ApiOkResponse({ description: 'Password presence flag.', type: HasPasswordResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token.' })
  async hasPassword(@Req() req: Request): Promise<{ hasPassword: boolean }> {
    const user = req.user as UserWithRelations;
    return this.authService.hasPassword(user.id);
  }
}
