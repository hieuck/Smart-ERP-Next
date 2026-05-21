import { test, expect } from '@playwright/test';

test.describe('03 - Orders to Invoice', () => {
  const routes = ['/orders', '/approvals', '/e-invoice', '/payments', '/pos'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
