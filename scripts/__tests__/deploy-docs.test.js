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

  test('deploy-production.sh references the correct compose file and has a pre-flight check', () => {
    const f = path.join(repoRoot, 'scripts', 'deploy-production.sh');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('docker-compose.prod.yml');
    expect(content).not.toContain('docker compose.production.yml');
    expect(content).toContain('COMPOSE_FILE=');
    expect(content).toContain('if [ ! -f "${COMPOSE_FILE}" ]; then');
  });

  test('README.md no longer reports the old inflated metrics', () => {
    const readmePath = path.join(repoRoot, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);
    const readme = fs.readFileSync(readmePath, 'utf8');

    expect(readme).not.toContain('1,887 (unit + integration + E2E)');
    expect(readme).not.toContain('93% stmts / 97% branches / 98% funcs / 94% lines');
    expect(readme).toContain('coverage/coverage-summary.json');
    expect(readme).toContain('Coverage is currently low');
  });

  test('stale workflow has meaningful messages, exempt labels, and does not auto-close', () => {
    const f = path.join(repoRoot, '.github', 'workflows', 'stale.yml');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');

    expect(content).not.toContain("stale-issue-message: 'Stale issue message'");
    expect(content).not.toContain("stale-pr-message: 'Stale pull request message'");
    expect(content).toContain('exempt-issue-labels:');
    expect(content).toContain('exempt-pr-labels:');
    expect(content).toContain('security');
    expect(content).toContain('priority/high');
    expect(content).toContain('days-before-close: -1');
    expect(content).toContain('remove-stale-when-updated: true');
  });

  test('labeler workflow has a configuration file', () => {
    const workflowPath = path.join(repoRoot, '.github', 'workflows', 'label.yml');
    const configPath = path.join(repoRoot, '.github', 'labeler.yml');
    expect(fs.existsSync(workflowPath)).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);

    const config = fs.readFileSync(configPath, 'utf8');
    expect(config).toContain('api:');
    expect(config).toContain('web:');
    expect(config).toContain('database:');
    expect(config).toContain('schema:');
    expect(config).toContain('ci:');
    expect(config).toContain('tests:');
  });

  test('root jest config has a single testEnvironment key', () => {
    const jestConfigPath = path.join(repoRoot, 'jest.config.js');
    expect(fs.existsSync(jestConfigPath)).toBe(true);
    const content = fs.readFileSync(jestConfigPath, 'utf8');

    const matches = content.match(/testEnvironment:/g) ?? [];
    expect(matches.length).toBe(1);
  });

  test('workflow files do not use non-existent action major versions', () => {
    const workflowsDir = path.join(repoRoot, '.github', 'workflows');
    expect(fs.existsSync(workflowsDir)).toBe(true);

    const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      const invalidVersions = content.match(/uses:\s+[^@\s]+@v6\b/g) ?? [];
      expect(invalidVersions).toEqual([]);
    }
  });

  test('desktop release artifact script exists and exits 0 when bundle dir is missing', () => {
    const scriptPath = path.join(repoRoot, 'scripts', 'ensure-desktop-release-artifact.js');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const result = require('node:child_process').spawnSync(
      process.execPath,
      [scriptPath],
      { cwd: repoRoot, encoding: 'utf8' },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Desktop release bundle directory not found');
  });

  test('turbo.json does not reference a non-existent dev:desktop task', () => {
    const turboPath = path.join(repoRoot, 'turbo.json');
    expect(fs.existsSync(turboPath)).toBe(true);
    const content = fs.readFileSync(turboPath, 'utf8');

    expect(content).not.toContain('"dev:desktop"');
  });

  test('.env.production is not committed to source control', () => {
    const trackedEnvPath = path.join(repoRoot, '.env.production');
    expect(fs.existsSync(trackedEnvPath)).toBe(false);

    const examplePath = path.join(repoRoot, '.env.production.example');
    expect(fs.existsSync(examplePath)).toBe(true);

    const gitignorePath = path.join(repoRoot, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    expect(gitignore).toContain('.env.production');
  });

  test('Dockerfile uses a valid PostgreSQL base image', () => {
    const dockerfilePath = path.join(repoRoot, 'Dockerfile');
    expect(fs.existsSync(dockerfilePath)).toBe(true);
    const content = fs.readFileSync(dockerfilePath, 'utf8');

    expect(content).not.toContain('postgres:18-alpine');
    expect(content).toMatch(/FROM\s+postgres:\d+-alpine/);
  });

  test('types index does not export accounting module more than once', () => {
    const indexPath = path.join(repoRoot, 'packages', 'types', 'src', 'index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf8');

    const matches = content.match(/export \* from '\.\/accounting';/g) ?? [];
    expect(matches.length).toBe(1);
  });

  test('products import endpoint enforces a CSV file size limit', () => {
    const controllerPath = path.join(repoRoot, 'apps', 'api', 'src', 'products', 'products.controller.ts');
    expect(fs.existsSync(controllerPath)).toBe(true);
    const content = fs.readFileSync(controllerPath, 'utf8');

    const importBlock = content.match(/@Post\('import'\)[\s\S]*?async importProducts/)?.[0] ?? '';
    expect(importBlock).toContain('fileSize');
    expect(importBlock).toContain('5 * 1024 * 1024');
    expect(importBlock).toContain('text/csv');
  });
});
