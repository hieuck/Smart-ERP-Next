import { test, expect } from '@playwright/test';

test.describe('08 - Analytics and Reports', () => {
  const routes = ['/analytics', '/analytics-dashboard', '/forecast', '/reports', '/quality', '/automation', '/omnichannel', '/loyalty'];

  for (const route of routes) {
    test(`${route} module loads correctly`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('body')).toBeVisible();
      await page.waitForLoadState('domcontentloaded');
    });
  }
});
