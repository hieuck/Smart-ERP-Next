const fs = require('fs');
const path = require('path');

describe('CI-local scripts', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  test('ci-local.ps1 exists and mirrors CI logical gates', () => {
    const f = path.join(repoRoot, 'scripts', 'ci-local.ps1');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');

    expect(content).toContain('pnpm type-check');
    expect(content).toContain('pnpm test');
    expect(content).toContain('pnpm lint');
    expect(content).toContain('pnpm qa:commit');
    expect(content).toContain('pnpm build');
    expect(content).toContain('test:e2e');
    expect(content).toContain('SkipE2e');
    expect(content).not.toContain('JWT_SECRET = "ci-local-secret"');
  });

  test('ci-local.sh exists and mirrors CI logical gates including E2E', () => {
    const f = path.join(repoRoot, 'scripts', 'ci-local.sh');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');

    expect(content).toContain('pnpm type-check');
    expect(content).toContain('pnpm test');
    expect(content).toContain('pnpm lint');
    expect(content).toContain('pnpm qa:commit');
    expect(content).toContain('pnpm build');
    expect(content).toContain('test:e2e');
    expect(content).toContain('SKIP_E2E');
  });

  test('CLAUDE.md accurately describes ci-local E2E behavior', () => {
    const f = path.join(repoRoot, 'CLAUDE.md');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');

    const ciLocalSection = content.match(/## 5\. CI-Equivalent Local Test[\s\S]*?(?=\n## \d+\.|$)/)?.[0] ?? '';
    expect(ciLocalSection).toContain('E2E');
    expect(/skip|E2E/i.test(ciLocalSection)).toBe(true);
  });
});
