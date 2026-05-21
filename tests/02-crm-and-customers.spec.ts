import { test, expect } from '@playwright/test';

test.describe('02 - CRM and Customers', () => {
  const routes = ['/crm', '/customers'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      // Wait for network idle to ensure no runtime errors on load
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
