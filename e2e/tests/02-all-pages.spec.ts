import { test, expect, type Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';
const loginButtonSelector = 'button[type="submit"], button:has-text("Đăng nhập"), button:has-text("Login")';

async function typeField(page: Page, selector: string, value: string) {
  const field = page.locator(selector).first();
  await expect(field).toBeEditable({ timeout: 10000 });
  await field.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await typeField(page, emailSelector, 'admin@smarterp.vn');
  await typeField(page, passwordSelector, 'admin123');
  const loginBtn = page.locator(loginButtonSelector).first();
  await expect(loginBtn).toBeEnabled();
  await Promise.all([
    page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 }),
    loginBtn.click(),
  ]);
}

// ═══════════════════════════════════════════════════════════════════
// All Pages Navigation — every route in the app loads < 500
// ═══════════════════════════════════════════════════════════════════

test.describe('All Pages Navigation (Authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  // --- Core Business ---
  const corePages = [
    '/dashboard',
    '/products',
    '/products/create',
    '/products/export',
    '/products/import',
    '/orders',
    '/customers',
    '/customers/create',
    '/inventory',
    '/payments',
    '/purchasing',
    '/purchasing/create',
    '/suppliers',
    '/suppliers/create',
    '/warehouses',
  ];

  for (const path of corePages) {
    test(`Core: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(20);
    });
  }

  // --- HR Module ---
  const hrPages = [
    '/hr/employees',
    '/hr/payroll',
    '/hr/attendance',
  ];

  for (const path of hrPages) {
    test(`HR: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Accounting & Finance ---
  const financePages = [
    '/accounting',
    '/e-invoice',
    '/fixed-assets',
  ];

  for (const path of financePages) {
    test(`Finance: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- CRM ---
  const crmPages = [
    '/crm',
  ];

  for (const path of crmPages) {
    test(`CRM: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Manufacturing ---
  const mfgPages = [
    '/manufacturing/bom',
    '/manufacturing/mrp',
    '/manufacturing/production-orders',
    '/quality',
  ];

  for (const path of mfgPages) {
    test(`Manufacturing: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Analytics & Reports ---
  const analyticsPages = [
    '/analytics-dashboard',
    '/analytics/forecast',
    '/analytics/churn',
    '/analytics/clv',
    '/reports',
    '/reports/advanced',
    '/reports/forecast',
    '/reports/cashflow-forecast',
    '/forecast/dashboard',
  ];

  for (const path of analyticsPages) {
    test(`Analytics: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Admin ---
  const adminPages = [
    '/admin/activity-logs',
    '/admin/benchmarks',
    '/admin/performance',
  ];

  for (const path of adminPages) {
    test(`Admin: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Helpdesk & Support ---
  const supportPages = [
    '/helpdesk/tickets',
    '/chat',
    '/omnichannel',
  ];

  for (const path of supportPages) {
    test(`Support: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Loyalty ---
  const loyaltyPages = [
    '/loyalty/cards',
    '/loyalty/rewards',
  ];

  for (const path of loyaltyPages) {
    test(`Loyalty: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }

  // --- Other ---
  const otherPages = [
    '/profile',
    '/users',
    '/settings',
    '/settings/ecommerce',
    '/settings/xero',
    '/approvals',
    '/automation',
    '/projects',
    '/pos',
    '/mvp',
  ];

  for (const path of otherPages) {
    test(`Other: ${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res!.status()).toBeLessThan(500);
      await page.waitForLoadState('domcontentloaded');
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Public pages — no auth required
// ═══════════════════════════════════════════════════════════════════

test.describe('Public Pages (No Auth)', () => {
  test('Login page renders form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator(emailSelector);
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    const passwordInput = page.locator(passwordSelector);
    await expect(passwordInput).toBeVisible();
    const submitBtn = page.locator(loginButtonSelector).first();
    await expect(submitBtn).toBeVisible();
  });

  test('Register page renders form', async ({ page }) => {
    const res = await page.goto('/register');
    expect(res!.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });
});
