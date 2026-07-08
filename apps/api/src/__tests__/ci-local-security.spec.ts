import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('ci-local.sh security', () => {
  const scriptPath = resolve(__dirname, '..', '..', '..', '..', 'scripts', 'ci-local.sh');
  const script = readFileSync(scriptPath, 'utf-8');

  it('does not contain hardcoded ci-local-secret JWT_SECRET', () => {
    expect(script).not.toContain('JWT_SECRET="ci-local-secret"');
  });

  it('does not contain hardcoded postgres DB_PASS', () => {
    expect(script).not.toContain('DB_PASS="postgres"');
  });

  it('reads JWT_SECRET from environment or generates it per run', () => {
    expect(script).toMatch(/JWT_SECRET\s*=\s*"\$\{JWT_SECRET:/);
  });

  it('reads DB_PASS from environment or generates it per run', () => {
    expect(script).toMatch(/DB_PASS\s*=\s*"\$\{DB_PASS:/);
  });

  it('uses DB_USER from environment with a safe default', () => {
    expect(script).toMatch(/DB_USER\s*=\s*"\$\{DB_USER:-postgres\}"/);
  });
});
