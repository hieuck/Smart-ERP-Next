/**
 * Backup Restore Verification Script
 *
 * Tests that a database backup file is valid and can be restored.
 * Usage: node scripts/verify-backup.js <backup-file>
 *
 * Verification steps:
 * 1. Check file exists and is non-empty
 * 2. Verify it's a valid SQL dump (starts with -- or contains CREATE/INSERT)
 * 3. Optionally restore to a test database and verify
 */

const { existsSync, statSync, readFileSync } = require('fs');
const { execSync } = require('child_process');

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node scripts/verify-backup.js <backup-file>');
  process.exit(1);
}

let exitCode = 0;

// Step 1: File existence and size
if (!existsSync(backupFile)) {
  console.error(`FAIL: Backup file not found: ${backupFile}`);
  process.exit(1);
}
const stats = statSync(backupFile);
if (stats.size === 0) {
  console.error(`FAIL: Backup file is empty: ${backupFile}`);
  process.exit(1);
}
console.log(`PASS: Backup file exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

// Step 2: Content validation
const firstChunk = readFileSync(backupFile, 'utf8').slice(0, 2048);
const hasSQLContent = firstChunk.includes('--') ||
  firstChunk.includes('CREATE') ||
  firstChunk.includes('INSERT') ||
  firstChunk.includes('COPY');
if (!hasSQLContent) {
  console.error('FAIL: File does not appear to be a valid SQL backup');
  exitCode = 1;
} else {
  console.log('PASS: File contains valid SQL content');
}

// Step 3: Try restoring to verify (requires TEST_DATABASE_URL)
const testDbUrl = process.env.TEST_DATABASE_URL;
if (testDbUrl) {
  try {
    console.log('INFO: Attempting restore to test database...');
    execSync(`psql "${testDbUrl}" < "${backupFile}"`, { stdio: 'pipe', timeout: 120000 });
    console.log('PASS: Backup restored successfully to test database');
  } catch (err) {
    console.error(`FAIL: Restore failed: ${err.message}`);
    exitCode = 1;
  }
} else {
  console.log('SKIP: TEST_DATABASE_URL not set, skipping restore verification');
}

process.exit(exitCode);
