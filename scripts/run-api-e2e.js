const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { buildGateEnv } = require('./quality-gate');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return values;
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return values;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');
      return { ...values, [key]: value };
    }, {});
}

function buildApiE2EEnv(cwd = process.cwd()) {
  const rootEnv = parseEnvFile(path.join(cwd, '.env'));
  const env = buildGateEnv(cwd);
  const dbUser = env.DB_USER || rootEnv.DB_USER || 'smart_erp';
  const dbPassword = env.DB_PASSWORD || rootEnv.DB_PASSWORD || 'smart_erp';
  const dbPort = env.DB_PORT || rootEnv.DB_PORT || '5432';
  const dbName = env.DB_NAME || rootEnv.DB_NAME || 'smart_erp';

  return {
    ...env,
    DATABASE_URL:
      env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@localhost:${dbPort}/${dbName}`,
    JWT_SECRET: env.JWT_SECRET || 'release-e2e-secret',
    NODE_ENV: env.NODE_ENV || 'test',
  };
}

function resolveCommand(cmd) {
  if (process.platform !== 'win32') return cmd;

  // On Windows, spawnSync without a shell may not resolve .cmd/.bat wrappers.
  // Explicitly use pnpm.cmd so the binary path is not interpreted by a shell.
  return `${cmd}.cmd`;
}

function runApiE2E(cwd = process.cwd()) {
  if (typeof cwd !== 'string' || cwd.length === 0) {
    throw new TypeError('cwd must be a non-empty string');
  }
  const safeCwd = path.resolve(cwd);

  const result = childProcess.spawnSync(
    resolveCommand('pnpm'),
    ['--filter', '@smart-erp/api', 'exec', 'jest', '--config', 'jest-e2e.json', '--runInBand', '--detectOpenHandles'],
    {
      cwd: safeCwd,
      env: buildApiE2EEnv(safeCwd),
      shell: false,
      stdio: 'inherit',
    },
  );

  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(runApiE2E());
}

module.exports = {
  buildApiE2EEnv,
  parseEnvFile,
  runApiE2E,
};
