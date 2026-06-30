/**
 * Environment Parity Check
 *
 * Verifies that .env.example, .env.staging.example, and .env.production.example
 * have the same set of variables (keys only, not values).
 *
 * Usage: node scripts/check-env-parity.js
 *
 * Exit code: 0 if all files have the same keys, 1 otherwise
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const files = ['.env.example', '.env.staging.example', '.env.production.example'];

function parseKeys(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, 'utf8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());
}

const allKeys = files.map((f) => ({ file: f, keys: new Set(parseKeys(join(ROOT, f))) }));
const [base, ...others] = allKeys;
let exitCode = 0;

for (const other of others) {
  const missing = [...base.keys].filter((k) => !other.keys.has(k));
  const extra = [...other.keys].filter((k) => !base.keys.has(k));

  if (missing.length > 0) {
    console.error(`MISSING in ${other.file}: ${missing.join(', ')}`);
    exitCode = 1;
  }
  if (extra.length > 0) {
    console.error(`EXTRA in ${other.file} (not in .env.example): ${extra.join(', ')}`);
    exitCode = 1;
  }
}

if (exitCode === 0) {
  console.log('✅ All env files have matching keys');
} else {
  console.error('❌ Environment parity check failed');
}
process.exit(exitCode);
