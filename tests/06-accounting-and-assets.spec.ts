import { test, expect } from '@playwright/test';

test.describe('06 - Accounting and Assets', () => {
  const routes = ['/accounting', '/fixed-assets'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
