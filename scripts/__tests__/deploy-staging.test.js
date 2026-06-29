const fs = require('fs');
const path = require('path');

describe('Staging Deployment Pipeline', () => {
  const repoRoot = path.resolve(__dirname, '../..');

  test('deploy-staging.yml exists with build + deploy steps', () => {
    const f = path.join(repoRoot, '.github/workflows/deploy-staging.yml');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('docker/build-push-action');
    expect(content).toContain('appleboy/ssh-action');
    expect(content).toContain('STAGING_HOST');
  });

  test('deploy-staging.yml runs on push to dev', () => {
    const f = path.join(repoRoot, '.github/workflows/deploy-staging.yml');
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain('branches: [ dev ]');
  });

  test('auto-deploy can be disabled by removing STAGING_HOST secret', () => {
    const f = path.join(repoRoot, '.github/workflows/deploy-staging.yml');
    const content = fs.readFileSync(f, 'utf8');
    expect(content).toContain("secrets.STAGING_HOST != ''");
  });
});
