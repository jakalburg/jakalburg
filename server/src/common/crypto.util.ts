import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { env } from '../config/env';

/**
 * Symmetric encryption for secrets we must store and later read back —
 * currently just the SMTP password on the EmailSettings singleton.
 *
 * AES-256-GCM, so the ciphertext is authenticated: tampering fails to decrypt
 * rather than yielding garbage. The key is derived with scrypt from
 * ENCRYPTION_KEY, which means any passphrase works (it needn't be 32 bytes).
 *
 * Threat model: this protects against a database dump or a Neon snapshot
 * leaking the credential. It does NOT protect against an attacker who already
 * has the server's environment — they hold the key too.
 *
 * Values are stored as `v1:<iv>:<authTag>:<ciphertext>`, all base64. The `v1`
 * prefix is both a format marker and the signal that a value is encrypted at
 * all, so a plaintext value written before this existed is detected and passed
 * through rather than mangled.
 */

const FORMAT = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32;
// Fixed salt: the key must be reproducible across restarts, and the secret it
// derives from is already high-entropy.
const SALT = 'jakalburg.emailsettings.v1';

function getKey(): Buffer {
  // ENCRYPTION_KEY is preferred; JWT_SECRET is the fallback so an existing
  // deployment encrypts correctly before the new var is set anywhere.
  const secret = env.ENCRYPTION_KEY || env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Cannot encrypt: set ENCRYPTION_KEY (or JWT_SECRET) in the environment',
    );
  }
  return scryptSync(secret, SALT, KEY_BYTES);
}

/** True when `value` is something this module produced. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${FORMAT}:`);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Reverses encryptSecret. A value that was never encrypted is returned as-is,
 * so rows written before encryption existed still work. Returns '' when the
 * value can't be decrypted (wrong/rotated key), which surfaces as "SMTP not
 * configured" rather than a crash on every send.
 */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return '';
  if (!isEncrypted(stored)) return stored;

  const [, ivB64, tagB64, dataB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !dataB64) return '';

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}
