const fs = require('fs');
const path = require('path');

describe('Deployment Documentation', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  test('DEPLOY.md exists with production instructions', () => {
    const f = path.join(repoRoot, 'DEPLOY.md');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('docker compose');
    expect(content).toContain('DATABASE_URL');
    expect(content).toContain('JWT_SECRET');
  });

  test('docker-compose.prod.yml exists with 3 services', () => {
    const f = path.join(repoRoot, 'docker-compose.prod.yml');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('postgres:');
    expect(content).toContain('api:');
    expect(content).toContain('web:');
  });

  test('.env.production.example exists with all required vars', () => {
    const f = path.join(repoRoot, '.env.production.example');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('DB_PASSWORD');
    expect(content).toContain('JWT_SECRET');
  });

  test('ci-local.sh includes type-check and test steps', () => {
    const f = path.join(repoRoot, 'scripts', 'ci-local.sh');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('type-check');
    expect(content).toContain('pnpm test');
    expect(content).toContain('ALL TESTS PASSED');
  });
});
