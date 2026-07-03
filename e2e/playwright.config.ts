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
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env.CROSS_BROWSER ? [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ] : []),
  ],
  webServer: [
    {
      command: 'node -e "setInterval(()=>{}, 1 << 30)"',
      url: 'http://localhost:3456/health',
      timeout: 5000,
      reuseExistingServer: true,
      env: {
        PORT: process.env.API_PORT ?? '3456',
        JWT_SECRET: process.env.JWT_SECRET ?? 'ci-e2e-secret',
        DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://smart_erp:smart_erp@localhost:5432/smart_erp',
      },
    },
    {
      command: 'node -e "setInterval(()=>{}, 1 << 30)"',
      url: 'http://localhost:3457/login',
      timeout: 5000,
      reuseExistingServer: true,
      env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3456',
        PORT: process.env.WEB_PORT ?? '3457',
      },
    },
  ],
});
