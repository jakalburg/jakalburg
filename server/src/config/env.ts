import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized, typed environment access — mirrors the kaybykhushie pattern
 * (a singleton class with getters, NOT @nestjs/config). Import `{ env }`.
 */
class Environment {
  // ── Core ──────────────────────────────────────────────────────────────
  get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  get PORT(): number {
    const port = process.env.PORT;
    if (!port) return 8080;
    const parsed = parseInt(port, 10);
    if (isNaN(parsed)) throw new Error(`Invalid PORT value: ${port}`);
    return parsed;
  }

  get PRODUCTION_URL(): string {
    return process.env.PRODUCTION_URL || '';
  }

  get DATABASE_URL(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error('CRITICAL: DATABASE_URL is missing from environment variables');
      throw new Error('DATABASE_URL is required');
    }
    return url;
  }

  // ── Frontend / CORS ───────────────────────────────────────────────────
  get FRONTEND_URL(): string {
    if (this.isProduction) return process.env.FRONTEND_URL_PROD || '';
    return process.env.FRONTEND_URL || '';
  }

  get FRONTEND_URL_PROD(): string {
    return process.env.FRONTEND_URL_PROD || '';
  }

  // ── JWT ───────────────────────────────────────────────────────────────
  get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('CRITICAL: JWT_SECRET is missing from environment variables');
      // Fail hard in production — signing tokens with a known placeholder would
      // let anyone forge an admin JWT and defeat every route guard. Only fall
      // back (dev convenience) when NOT in production.
      if (this.isProduction) {
        throw new Error('JWT_SECRET is required in production');
      }
      return 'placeholder-secret-change-me';
    }
    return secret;
  }

  get JWT_EXPIRES_IN(): string {
    return process.env.JWT_EXPIRES_IN || '30d';
  }

  // ── Initial admin ─────────────────────────────────────────────────────
  get ADMIN_EMAIL(): string {
    return process.env.ADMIN_EMAIL || 'admin@jakalburgcreation.com';
  }

  get ADMIN_PASSWORD(): string {
    return process.env.ADMIN_PASSWORD || 'admin@123';
  }

  // ── Owner notifications ───────────────────────────────────────────────
  // Recipient for the new-order owner notification. Defaults to ADMIN_EMAIL
  // but kept separate on purpose: ADMIN_EMAIL doubles as the admin *login*
  // identity (a branded admin@jakalburgcreation.com whose domain has no MX
  // record, so mail to it bounces). OWNER_EMAIL lets order alerts go to a
  // real, deliverable inbox without changing what the admin logs in with.
  get OWNER_EMAIL(): string {
    return process.env.OWNER_EMAIL || this.ADMIN_EMAIL;
  }

  // ── Google OAuth ──────────────────────────────────────────────────────
  // Jakalburg uses GOOGLE_CLIENT_ID/SECRET; accept kaybykhushie's
  // OAUTH_CLIENT_ID/SECRET as a fallback so either convention works.
  get GOOGLE_CLIENT_ID(): string {
    return process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
  }

  get GOOGLE_CLIENT_SECRET(): string {
    return (
      process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || ''
    );
  }

  /**
   * Key for encrypting secrets at rest (currently the SMTP password stored on
   * the EmailSettings singleton). Falls back to JWT_SECRET so an existing
   * deployment works before this is set; prefer a dedicated value so rotating
   * the JWT secret doesn't make stored secrets unreadable.
   */
  get ENCRYPTION_KEY(): string {
    return process.env.ENCRYPTION_KEY || '';
  }

  // ── SMTP (nodemailer) ─────────────────────────────────────────────────
  get SMTP_HOST(): string {
    return process.env.SMTP_HOST || 'smtp.gmail.com';
  }

  get SMTP_PORT(): number {
    const port = process.env.SMTP_PORT;
    return port ? parseInt(port, 10) : 587;
  }

  get SMTP_SECURE(): boolean {
    // true for 465, false for 587 (STARTTLS)
    if (process.env.SMTP_SECURE != null) {
      return process.env.SMTP_SECURE === 'true';
    }
    return this.SMTP_PORT === 465;
  }

  get SMTP_USER(): string {
    return process.env.SMTP_USER || process.env.SMTP_FROM_EMAIL || '';
  }

  get SMTP_PASSWORD(): string {
    return process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
  }

  get SMTP_FROM_EMAIL(): string {
    return process.env.SMTP_FROM_EMAIL || this.SMTP_USER;
  }

  get SMTP_FROM_NAME(): string {
    return process.env.SMTP_FROM_NAME || this.STORE_NAME;
  }

  // ── OTP policy ────────────────────────────────────────────────────────
  get OTP_EXPIRY_MINUTES(): number {
    const v = process.env.OTP_EXPIRY_MINUTES;
    return v ? parseInt(v, 10) : 10;
  }

  get OTP_MAX_ATTEMPTS(): number {
    const v = process.env.OTP_MAX_ATTEMPTS;
    return v ? parseInt(v, 10) : 5;
  }

  get OTP_RESEND_COOLDOWN_SECONDS(): number {
    const v = process.env.OTP_RESEND_COOLDOWN_SECONDS;
    return v ? parseInt(v, 10) : 60;
  }

  // Lifetime of an emailed password-reset LINK token (minutes). Longer than an
  // OTP because the user has to switch to their inbox and click through.
  get RESET_TOKEN_EXPIRY_MINUTES(): number {
    const v = process.env.RESET_TOKEN_EXPIRY_MINUTES;
    return v ? parseInt(v, 10) : 60;
  }

  // ── Branding / docs ───────────────────────────────────────────────────
  get STORE_NAME(): string {
    return process.env.STORE_NAME || 'Jakalburg';
  }

  get SWAGGER_PATH(): string {
    return process.env.SWAGGER_PATH || '/api-docs';
  }

  // ── Cloudinary (media uploads) ────────────────────────────────────────
  // Creds live in server/.env. Unlike kaybykhushie (which stores them in a DB
  // Settings row), Jakalburg reads them straight from the environment.
  get CLOUDINARY_CLOUD_NAME(): string {
    return process.env.CLOUDINARY_CLOUD_NAME || '';
  }

  get CLOUDINARY_API_KEY(): string {
    return process.env.CLOUDINARY_API_KEY || '';
  }

  get CLOUDINARY_API_SECRET(): string {
    return process.env.CLOUDINARY_API_SECRET || '';
  }

  /** True only when all three Cloudinary credentials are present. */
  get isCloudinaryConfigured(): boolean {
    return Boolean(
      this.CLOUDINARY_CLOUD_NAME &&
        this.CLOUDINARY_API_KEY &&
        this.CLOUDINARY_API_SECRET,
    );
  }

  // Max upload size per image, in megabytes.
  get UPLOAD_IMAGE_MAX_SIZE(): number {
    const v = process.env.UPLOAD_IMAGE_MAX_SIZE;
    return v ? parseInt(v, 10) : 5;
  }

  // ── Google Sheets order sync ──────────────────────────────────────────
  // The deployed Apps Script Web App (google_sheets_appscript.gs) that mirrors
  // orders into the owner's spreadsheet. Optional: with either value missing
  // the sync is simply skipped — checkout, emails, and the admin all behave
  // exactly as before.
  get GOOGLE_SHEETS_WEBHOOK_URL(): string {
    return process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
  }

  // Must match the WEBHOOK_SECRET Script Property on the Apps Script project,
  // byte for byte — a mismatch makes the script reject every post as
  // "Unauthorized request."
  get GOOGLE_SHEETS_WEBHOOK_SECRET(): string {
    return process.env.GOOGLE_SHEETS_WEBHOOK_SECRET || '';
  }

  // Informational only — the script opens the sheet via its own SPREADSHEET_ID
  // Script Property. Kept so the admin can deep-link to the spreadsheet.
  get GOOGLE_SHEETS_SPREADSHEET_ID(): string {
    return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  }

  /** True only when both the Web App URL and the shared secret are present. */
  get isGoogleSheetsConfigured(): boolean {
    return Boolean(
      this.GOOGLE_SHEETS_WEBHOOK_URL && this.GOOGLE_SHEETS_WEBHOOK_SECRET,
    );
  }
}

export const env = new Environment();
export const ENV_VARS = env;
