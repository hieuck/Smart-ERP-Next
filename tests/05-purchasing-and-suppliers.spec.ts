import { test, expect } from '@playwright/test';

test.describe('05 - Purchasing and Suppliers', () => {
  const routes = ['/purchasing', '/suppliers'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
