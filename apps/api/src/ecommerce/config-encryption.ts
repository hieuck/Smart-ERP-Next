import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

function getKey(): Buffer {
  const envKey = process.env.ECOMMERCE_CONFIG_ENCRYPTION_KEY;
  if (envKey) {
    return Buffer.from(envKey, 'hex');
  }
  // Fallback deterministic key for tests/development ONLY.
  // Production must set ECOMMERCE_CONFIG_ENCRYPTION_KEY to a strong random 32-byte hex string.
  return scryptSync('smart-erp-dev-fallback', 'smart-erp-salt', KEY_LENGTH);
}

function ensureKeyLength(key: Buffer): Buffer {
  if (key.length !== KEY_LENGTH) {
    return scryptSync(key, 'smart-erp-salt', KEY_LENGTH);
  }
  return key;
}

export function encryptConfig(plaintext: string): string {
  const key = ensureKeyLength(getKey());
  const iv = randomBytes(IV_LENGTH);
  const salt = randomBytes(SALT_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

export function decryptConfig(ciphertext: string): string {
  const key = ensureKeyLength(getKey());
  const combined = Buffer.from(ciphertext, 'base64');
  if (combined.length < SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted config');
  }
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
