import { test, expect } from '@playwright/test';

test('capture products page with fix', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.locator('input[type="email"]').fill('admin@smarterp.vn');
  await page.locator('input[type="password"]').fill('admin123');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

  await page.goto('/products');
  await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: 'tmp/products-fix-actual.png', fullPage: true });
});
