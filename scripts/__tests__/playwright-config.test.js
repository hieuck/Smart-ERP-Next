const fs = require('node:fs');
const path = require('node:path');

describe('Playwright release configuration', () => {
  it('starts or reuses API and web servers with explicit end-user E2E ports', () => {
    const config = fs.readFileSync(
      path.join(__dirname, '..', '..', 'e2e', 'playwright.config.ts'),
      'utf8',
    );

    expect(config).toContain("baseURL: 'http://localhost:3457'");
    expect(config).toContain("command: 'node ../apps/api/dist/apps/api/src/main.js'");
    expect(config).toContain("url: 'http://localhost:3456/health'");
    expect(config).toContain("command: 'pnpm --filter @smart-erp/web dev --port 3457'");
    expect(config).toContain("NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3456'");
  });
});
