import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface SeedAdminCredential {
  email: string;
  role: string;
}

export interface LogSeedAdminCredentialsOptions {
  nodeEnv?: string;
  logger?: (message: string) => void;
}

/**
 * Generate a strong random password and its bcrypt hash for seeded admin accounts.
 * Returns the plaintext password (for logging in dev/test only) and the hash to store.
 *
 * Uses 32 bytes from `crypto.randomBytes` encoded as base64url. This keeps the
 * full entropy of the random bytes instead of truncating to a fixed length.
 */
export function generateAdminPassword(overridePassword?: string): { password: string; hash: string } {
  const password = overridePassword ?? randomBytes(32).toString('base64url');
  const hash = bcrypt.hashSync(password, 10);
  return { password, hash };
}

/**
 * Print seeded admin credentials to the console only in non-production environments.
 *
 * `nodeEnv` and `logger` can be overridden for tests to avoid mutating global
 * `process.env` and `console`.
 */
export function logSeedAdminCredentials(
  credentials: SeedAdminCredential[],
  options: LogSeedAdminCredentialsOptions = {},
): void {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    return;
  }

  if (credentials.length === 0) {
    return;
  }

  const log = options.logger ?? console.log;
  log('\n⚠️  Seeded admin accounts created with randomly generated passwords:');
  for (const { email, role } of credentials) {
    // Do not print the plaintext password to the console. Code scanning tools
    // flag clear-text logging of credentials, and the password can be rotated
    // from the database if needed during local development.
    log(`   ${role}: ${email}`);
  }
  log('   Plaintext passwords are intentionally not logged.');
  log('   Rotate them before using this database in production.\n');
}
