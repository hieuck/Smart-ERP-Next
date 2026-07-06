import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Generate a strong random password and its bcrypt hash for seeded admin accounts.
 * Returns the plaintext password (for logging in dev/test only) and the hash to store.
 */
export function generateAdminPassword(): { password: string; hash: string } {
  const password = randomBytes(24).toString('base64url').slice(0, 32);
  const hash = bcrypt.hashSync(password, 10);
  return { password, hash };
}

/**
 * Print seeded admin credentials to the console only in non-production environments.
 */
export function logSeedAdminCredentials(
  credentials: { email: string; password: string; role: string }[],
): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log('\n⚠️  Seeded admin accounts created with randomly generated passwords:');
  for (const { email, password, role } of credentials) {
    console.log(`   ${role}: ${email} / ${password}`);
  }
  console.log('   These credentials are logged only in development/test mode.');
  console.log('   Rotate them before using this database in production.\n');
}
