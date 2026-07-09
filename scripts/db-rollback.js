/**
 * Database Migration Rollback Helper
 *
 * Usage: node scripts/db-rollback.js <migration-name>
 *
 * Applies the down migration SQL file for a given migration.
 * The rollback SQL file should be located at:
 *   packages/database/drizzle/rollback-<name>.sql
 */

const { execFileSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

const MIGRATION_NAME_RE = /^[A-Za-z0-9_-]+$/;

function validateMigrationName(migrationName) {
  if (!migrationName || !MIGRATION_NAME_RE.test(migrationName)) {
    throw new Error(
      'Invalid migration name. Use only alphanumeric characters, hyphens, and underscores.',
    );
  }
}

function runRollback(migrationName, databaseUrl) {
  validateMigrationName(migrationName);

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const rollbackPath = join(
    __dirname,
    '..',
    'packages',
    'database',
    'drizzle',
    `rollback-${migrationName}.sql`,
  );

  if (!existsSync(rollbackPath)) {
    throw new Error(`Rollback script not found: ${rollbackPath}\nCreate a rollback SQL file first.`);
  }

  console.log(`Applying rollback: ${migrationName}`);
  execFileSync('psql', [databaseUrl, '-f', rollbackPath], { stdio: 'inherit' });
  console.log('Rollback applied successfully');
}

function main() {
  const migrationName = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL;

  try {
    runRollback(migrationName, databaseUrl);
  } catch (error) {
    console.error('Rollback failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runRollback, validateMigrationName };
