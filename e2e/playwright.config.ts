import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 2,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 180000,
  use: {
    baseURL: 'http://localhost:3457',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @smart-erp/api dev',
      url: 'http://localhost:3456/health',
      timeout: 180000,
      reuseExistingServer: true,
      env: {
        PORT: process.env.API_PORT ?? '3456',
        JWT_SECRET: process.env.JWT_SECRET ?? 'ci-e2e-secret',
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://smart_erp:smart_erp@localhost:5432/smart_erp',
      },
    },
    {
      command: 'pnpm --filter @smart-erp/web dev --port 3457',
      url: 'http://localhost:3457/login',
      timeout: 120000,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3456',
        PORT: process.env.WEB_PORT ?? '3457',
      },
    },
  ],
});
