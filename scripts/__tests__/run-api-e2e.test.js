const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildApiE2EEnv, parseEnvFile } = require('../run-api-e2e');

describe('run-api-e2e wrapper', () => {
  it('parses simple env files', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-e2e-env-'));
    const envPath = path.join(tempDir, '.env');
    fs.writeFileSync(envPath, 'DB_USER=smart_erp\nDB_PASSWORD=\"smart_erp\"\n');

    expect(parseEnvFile(envPath)).toEqual({
      DB_PASSWORD: 'smart_erp',
      DB_USER: 'smart_erp',
    });
  });

  it('builds a localhost DATABASE_URL when caller did not provide one', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-e2e-env-'));
    fs.writeFileSync(path.join(tempDir, '.env'), 'DB_USER=app\nDB_PASSWORD=pass\n');

    const keys = ['DATABASE_URL', 'DB_USER', 'DB_PASSWORD', 'DB_PORT', 'DB_NAME'];
    const originals = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) {
      delete process.env[key];
    }

    try {
      expect(buildApiE2EEnv(tempDir).DATABASE_URL).toBe('postgresql://app:pass@localhost:5432/smart_erp');
    } finally {
      for (const key of keys) {
        if (originals[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originals[key];
        }
      }
    }
  });
});
