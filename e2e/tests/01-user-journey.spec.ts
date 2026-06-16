import { test, expect } from '@playwright/test';

const API = 'http://localhost:3456';
const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
const passwordSelector = 'input[type="password"]';
const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

async function expectNoFrameworkOverlay(page: import('@playwright/test').Page) {
  await expect(page.locator('text=/Unhandled Runtime Error|Application error|Build Error/i')).toHaveCount(0);
}

test.describe('End-user journey', () => {
  test.setTimeout(120000);

  test('visitor browses landing, registers, logs in, explores, then visits register page', async ({ page, request }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Visit landing page
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expectNoFrameworkOverlay(page);

    // 2. Click "Dùng thử" / "Bắt đầu miễn phí" to go to register
    await page.getByRole('link', { name: /dùng thử|bắt đầu miễn phí|start free/i }).first().click();
    await expect(page).toHaveURL(/\/register/);
    await expectNoFrameworkOverlay(page);

    // 3. Register a new account via UI
    const email = `journey-${stamp}@example.test`;
    const password = 'TestPass123!';
    const companyName = `Journey Co ${stamp}`;
    const name = `Journey User ${stamp}`;

    await page.locator('input[name="name"], input[placeholder*="tên" i], input[placeholder*="name" i]').first().fill(name);
    await page.locator(emailSelector).fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    const confirmInput = page.locator('input[type="password"]').nth(1);

    if (await confirmInput.isVisible()) {
      await confirmInput.fill(password);
    }

    const companyInput = page.locator('input[name="companyName"], input[placeholder*="công ty" i], input[placeholder*="company" i]');
    if (await companyInput.isVisible()) {
      await companyInput.fill(companyName);
    }

    await page.getByRole('button', { name: /đăng ký|register/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expectNoFrameworkOverlay(page);

    // 4. Browse products
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: /sản phẩm|products/i })).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);

    // 5. Browse inventory
    await page.goto('/inventory');
    await expect(page.getByText(/tồn kho|inventory|kho hàng/i)).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);

    // 6. Browse customers
    await page.goto('/customers');
    await expect(page.getByText(/khách hàng|customers/i)).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);

    // 7. Browse orders
    await page.goto('/orders');
    await expect(page.getByText(/đơn hàng|orders/i)).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);

    // 8. Browse POS
    await page.goto('/pos');
    await expect(page.getByText(/pos|cửa hàng|bán hàng/i)).toBeVisible({ timeout: 10000 });
    await expectNoFrameworkOverlay(page);

    // 9. Visit register page again (to verify it's accessible)
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /đăng ký|register/i })).toBeVisible();
    await expectNoFrameworkOverlay(page);

    expect(pageErrors).toEqual([]);
  });
});
