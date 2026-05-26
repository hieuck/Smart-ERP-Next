import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
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
      port: 3001,
      timeout: 60000,
      reuseExistingServer: true,
      cwd: '..',
      env: {
        ...process.env,
        PORT: process.env.PORT ?? '3001',
      },
    },
    {
      command: 'pnpm --filter @smart-erp/web dev --port 3000',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: true,
      cwd: '..',
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
      },
    },
  ],
});
