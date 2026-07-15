import { test, expect, type Page } from '@playwright/test';

const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';

async function loginByUi(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    if (/\/dashboard/.test(page.url())) return;
    try {
      await expect(page.locator(emailSelector)).toBeVisible({ timeout: 10000 });
      break;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  await page.locator(emailSelector).fill('admin@demo.vn');
  await page.locator(passwordSelector).fill('admin123');
  await page.getByRole('button', { name: /dang nhap|đăng nhập|login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

async function expectNoFrameworkOverlay(page: Page) {
  await expect(page.locator('text=/Unhandled Runtime Error|Application error|Build Error|Failed to compile/i')).toHaveCount(0);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'page should not create horizontal overflow in the tested viewport').toBeLessThanOrEqual(2);
}

test.describe('UI/UX end-user release audit', () => {
  test.setTimeout(90000);

  test('POS page loads and shows search and cart UI', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Network/resource 404s (e.g. missing images or Socket.IO fallback
        // requests in the E2E environment) are not UI/UX regressions. Only
        // fail on JS/page errors that indicate broken application logic.
        if (text.includes('Failed to load resource')) {
          // eslint-disable-next-line no-console
          console.log(`[E2E resource error ignored] ${text}`);
          return;
        }
        consoleErrors.push(text);
        // eslint-disable-next-line no-console
        console.log(`[E2E console error] ${text}`);
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
      // eslint-disable-next-line no-console
      console.log(`[E2E page error] ${err.message}`);
    });

    await loginByUi(page);
    await page.goto('/pos');
    await expect(page.getByPlaceholder(/tim san pham|tìm sản phẩm|Search products/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/gio hang trong|giỏ hàng trống/i)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    if (consoleErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Captured console/page errors during POS test:', consoleErrors);
    }

    expect(consoleErrors.length).toBe(0);
  });

  test('login surface is usable on a mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /smart erp next/i })).toBeVisible();
    await expect(page.locator(emailSelector)).toBeVisible();
    await expect(page.locator(passwordSelector)).toBeVisible();
    // Demo button is optional (gated by NEXT_PUBLIC_ENABLE_DEMO). Fill fields directly
    // when the button is not rendered so the test is not environment-dependent.
    const demoButton = page.getByRole('button', { name: /demo/i });
    if (await demoButton.isVisible().catch(() => false)) {
      await demoButton.click();
      await page.waitForTimeout(1000);
    } else {
      await page.locator(emailSelector).fill('admin@smarterp.vn');
      await page.locator(passwordSelector).fill('admin123');
    }
    await expectNoFrameworkOverlay(page);
    await expectNoHorizontalOverflow(page);
  });
});
