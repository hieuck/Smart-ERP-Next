import { test, expect } from '@playwright/test';

test.describe('04 - Products and Inventory', () => {
  const routes = ['/products', '/inventory', '/warehouses', '/warehouse-transfers', '/manufacturing'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
